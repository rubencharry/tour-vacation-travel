import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  protected mobileMenuOpen = signal(false);

  toggleMobileMenu() {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }
}
