import { Component } from '@angular/core';
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
  protected readonly team = [
    {
      name: 'Blanca Mendoza',
      role: 'Socia Fundadora & Directora Ejecutiva',
      photo: '/team/blanca.webp',
      years: '15 años de experiencia',
    },
    {
      name: 'José Gómez',
      role: 'Socio Fundador & Director de Operaciones',
      photo: '/team/jose.webp',
      years: '20 años de experiencia',
    },
    {
      name: 'Rubén Charry',
      role: 'Desarrollador Web & Arquitecto Cloud AWS',
      photo: '/team/ruben.webp',
      years: '3 años de experiencia',
    },
    {
      name: 'María José Gómez',
      role: 'Imagen de Marca y Creativa',
      photo: '/team/maria-jose.webp',
      years: '1 año de experiencia',
    },
    {
      name: 'Francy Reyes',
      role: 'Especialista en Diseño de Producto Turístico',
      photo: '/team/francy.webp',
      years: '7 años en turismo',
    },
    {
      name: 'Valentina Rodríguez',
      role: 'Directora de Marketing',
      photo: '/team/valentina.webp',
      years: '3 años de experiencia',
    },
    {
      name: 'Yulieth Roa',
      role: 'Especialista en Diseño de Producto Turístico',
      photo: '/team/yulieth.webp',
      years: '7 años en turismo',
    },
  ];

  protected readonly displayTeam = [...this.team, ...this.team];

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
}
