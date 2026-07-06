import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective],
  templateUrl: './nosotros.component.html',
  styleUrl: './nosotros.component.scss',
})
export class NosotrosComponent {
  protected readonly VISIBLE = 3;

  protected currentSlide = signal(0);
  protected readonly maxSlide = computed(() => this.team.length - this.VISIBLE);
  protected readonly dots = computed(() =>
    Array.from({ length: this.maxSlide() + 1 }, (_, i) => i),
  );
  protected readonly trackTranslate = computed(
    () => `translateX(-${this.currentSlide() * (100 / this.VISIBLE)}%)`,
  );

  protected readonly team = [
    {
      name: 'Ana Martínez',
      role: 'CEO & Fundadora',
      photo: 'https://i.pravatar.cc/400?img=47',
      years: '15 años en la industria',
    },
    {
      name: 'Carlos Ruiz',
      role: 'Director de Operaciones',
      photo: 'https://i.pravatar.cc/400?img=68',
      years: '12 años de experiencia',
    },
    {
      name: 'Lucía Gómez',
      role: 'Jefa de Experiencias',
      photo: 'https://i.pravatar.cc/400?img=48',
      years: '10 años en turismo',
    },
    {
      name: 'Sebastián López',
      role: 'Asesor Senior Europa',
      photo: 'https://i.pravatar.cc/400?img=52',
      years: '8 años en la región',
    },
    {
      name: 'Valentina Cruz',
      role: 'Asesora Caribe & Pacífico',
      photo: 'https://i.pravatar.cc/400?img=44',
      years: '7 años de experiencia',
    },
    {
      name: 'Mateo Herrera',
      role: 'Asesor Asia & Oceanía',
      photo: 'https://i.pravatar.cc/400?img=11',
      years: '6 años en la región',
    },
    {
      name: 'Camila Torres',
      role: 'Directora de Marketing',
      photo: 'https://i.pravatar.cc/400?img=45',
      years: '9 años en el sector',
    },
  ];

  protected readonly values = [
    {
      icon: 'favorite',
      title: 'Pasión',
      description: 'Amamos lo que hacemos y eso se refleja en cada itinerario que diseñamos.',
    },
    {
      icon: 'verified',
      title: 'Confianza',
      description: 'Precios transparentes, sin letra chica. Lo que ves es lo que pagas.',
    },
    {
      icon: 'diversity_3',
      title: 'Personalización',
      description: 'Cada viajero es único. Cada viaje, diseñado a su medida.',
    },
    {
      icon: 'public',
      title: 'Alcance Global',
      description: 'Más de 120 destinos y aliados estratégicos en los 5 continentes.',
    },
  ];

  protected prev(): void {
    this.currentSlide.update((n) => Math.max(0, n - 1));
  }

  protected next(): void {
    this.currentSlide.update((n) => Math.min(this.maxSlide(), n + 1));
  }

  protected goTo(index: number): void {
    this.currentSlide.set(index);
  }
}
