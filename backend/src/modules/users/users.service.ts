import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersRepository } from './users.repository';
import { CognitoAdminService } from '../cognito-admin/cognito-admin.service';
import { MailService } from '../mail/mail.service';
import { temporaryCredentialsTemplate } from '../mail/templates/temporary-credentials.template';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { User } from './entities/user.entity';
import { AuthenticatedUser } from '../auth/authenticated-user';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly repo: UsersRepository,
    private readonly cognito: CognitoAdminService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateUserDto, actor: AuthenticatedUser): Promise<User> {
    const email = dto.email.toLowerCase();
    const existing = await this.repo.findByEmail(email);
    if (existing) {
      throw new ConflictException(
        `Ya existe un usuario con el correo ${email}`,
      );
    }

    const { sub, temporaryPassword } = await this.cognito.createUser(
      email,
      'asesor',
    );

    const now = new Date().toISOString();
    const user: User = {
      userId: sub,
      email,
      name: dto.name,
      phone: dto.phone,
      area: dto.area,
      notes: dto.notes,
      role: 'asesor',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: actor.email,
    };
    await this.repo.put(user);

    this.sendCredentials(user, temporaryPassword).catch((err) =>
      this.logger.error(`Envío de credenciales falló para ${email}: ${err}`),
    );

    return user;
  }

  findAll(): Promise<User[]> {
    return this.repo.findAll();
  }

  async findOne(userId: string): Promise<User> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException(`Usuario ${userId} no encontrado`);
    return user;
  }

  async getOrCreateOwnProfile(actor: AuthenticatedUser): Promise<User> {
    const email = actor.email.toLowerCase();
    const existing = await this.repo.findByEmail(email);
    if (existing) return existing;

    if (!actor.role || !actor.sub) {
      throw new BadRequestException(
        'Tu usuario no tiene un grupo de Cognito asignado — contactá a un administrador',
      );
    }

    const now = new Date().toISOString();
    const user: User = {
      userId: actor.sub,
      email,
      name: email.split('@')[0],
      role: actor.role,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: 'self',
    };
    await this.repo.put(user);
    return user;
  }

  async updateOwnProfile(
    actor: AuthenticatedUser,
    dto: UpdateOwnProfileDto,
  ): Promise<User> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No hay campos para actualizar');
    }
    const own = await this.getOrCreateOwnProfile(actor);
    return this.repo.update(own.userId, {
      ...dto,
      updatedAt: new Date().toISOString(),
    });
  }

  async update(
    userId: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<User> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No hay campos para actualizar');
    }
    const target = await this.findOne(userId);
    this.assertCanManage(actor, target);
    return this.repo.update(userId, {
      ...dto,
      updatedAt: new Date().toISOString(),
    });
  }

  async resetPassword(userId: string, actor: AuthenticatedUser): Promise<void> {
    const target = await this.findOne(userId);
    this.assertCanManage(actor, target);

    const temporaryPassword = await this.cognito.resetPassword(target.email);
    this.sendCredentials(target, temporaryPassword).catch((err) =>
      this.logger.error(
        `Envío de credenciales falló para ${target.email}: ${err}`,
      ),
    );
  }

  async setActive(
    userId: string,
    active: boolean,
    actor: AuthenticatedUser,
  ): Promise<User> {
    const target = await this.findOne(userId);
    this.assertCanManage(actor, target);

    await this.cognito.setEnabled(target.email, active);
    return this.repo.update(userId, {
      status: active ? 'active' : 'inactive',
      updatedAt: new Date().toISOString(),
    });
  }

  private assertCanManage(actor: AuthenticatedUser, target: User): void {
    if (actor.role === 'admin') return;
    if (actor.role === 'gerente' && target.role === 'asesor') return;
    throw new ForbiddenException('No tenés permisos sobre este usuario');
  }

  private async sendCredentials(
    user: User,
    temporaryPassword: string,
  ): Promise<void> {
    const loginUrl = `${this.config.get<string>('FRONTEND_URL', '')}/admin/login`;
    const { subject, html } = temporaryCredentialsTemplate({
      name: user.name,
      email: user.email,
      temporaryPassword,
      loginUrl,
    });
    await this.mail.send({ to: user.email, subject, html });
  }
}
