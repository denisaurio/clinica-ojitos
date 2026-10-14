import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { panelDe } from '../../core/guards/role.guard';

/** Envía al panel que corresponde al rol activo. */
@Component({
  selector: 'app-dashboard-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class InicioComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.router.navigateByUrl(panelDe(this.auth.rol()));
  }
}