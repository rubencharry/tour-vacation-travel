import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective],
  templateUrl: './nosotros.component.html',
  styleUrl: './nosotros.component.scss',
})
export class NosotrosComponent implements OnInit {
  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Quiénes Somos',
      description: 'Conoce al equipo de Tour Vacation Travel. Más de 11 años creando experiencias de viaje únicas con pasión, confianza y un trato genuinamente personal.',
      path: '/nosotros',
    });
  }
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
      role: 'Directora de Desarrollo de Negocios y Producto',
      photo: '/team/francy.webp',
      years: '8 años en turismo',
    },
    {
      name: 'Valentina Rodríguez',
      role: 'Directora de Marketing',
      photo: '/team/valentina.webp',
      years: '3 años de experiencia',
    },
    {
      name: 'Yulieth Roa',
      role: 'Directora de Producto y Alianzas Estratégicas',
      photo: '/team/yulieth.webp',
      years: '10 años en turismo',
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
