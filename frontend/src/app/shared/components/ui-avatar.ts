import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type TamanoAvatar = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Avatar circular con iniciales; si hay `imagenUrl`, muestra la fotografía. */
@Component({
  selector: 'ui-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="'avatar avatar--' + tamano()" [class.avatar--foto]="!!imagenUrl()">
      @if (imagenUrl()) {
        <img [src]="imagenUrl()" [alt]="nombre()" />
      } @else {
        {{ iniciales() }}
      }
    </span>
  `,
  styleUrl: './ui-avatar.scss',
})
export class AvatarComponent {
  readonly iniciales = input('');
  readonly nombre = input('');
  readonly imagenUrl = input('');
  readonly tamano = input<TamanoAvatar>('sm');
}