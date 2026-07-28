import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.create(dto, actor);
  }

  @Roles('admin', 'gerente')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('me')
  getMe(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.getOrCreateOwnProfile(actor);
  }

  @Patch('me')
  updateMe(
    @Body() dto: UpdateOwnProfileDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.updateOwnProfile(actor, dto);
  }

  @Roles('admin', 'gerente')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('admin', 'gerente')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Roles('admin', 'gerente')
  @Post(':id/reset-password')
  @HttpCode(204)
  async resetPassword(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.service.resetPassword(id, actor);
  }

  @Roles('admin', 'gerente')
  @Post(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.setActive(id, true, actor);
  }

  @Roles('admin', 'gerente')
  @Post(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.service.setActive(id, false, actor);
  }
}
