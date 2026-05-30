import { Component } from '@angular/core';

@Component({
  selector: 'app-robo-loader',
  standalone: true,
  template: `
    <div class="robo-loader">
      <svg viewBox="0 0 80 72" xmlns="http://www.w3.org/2000/svg"
           class="robo-svg">
        <!-- Antena -->
        <line x1="40" y1="2" x2="40" y2="14"
              stroke="#166534" stroke-width="3" stroke-linecap="round"/>
        <circle cx="40" cy="2" r="4" fill="#166534"/>

        <!-- Cabeça — gira -->
        <g class="robo-cabeca">
          <rect x="10" y="14" width="60" height="52"
                rx="12" fill="white"
                stroke="#166534" stroke-width="2.5"/>
          <circle cx="28" cy="32" r="7" fill="#166534"/>
          <circle cx="52" cy="32" r="7" fill="#166534"/>
          <circle cx="30" cy="30" r="2.5" fill="white"/>
          <circle cx="54" cy="30" r="2.5" fill="white"/>
          <rect x="20" y="50" width="40" height="8"
                rx="4" fill="#166534" opacity="0.15"/>
          <rect x="24" y="52" width="10" height="4"
                rx="2" fill="#166534" class="robo-boca-seg"/>
          <rect x="36" y="52" width="10" height="4"
                rx="2" fill="#166534" class="robo-boca-seg"/>
          <rect x="48" y="52" width="6" height="4"
                rx="2" fill="#166534" class="robo-boca-seg"/>
        </g>
      </svg>
    </div>
  `,
  styles: [`
    .robo-loader {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .robo-svg {
      width: 80px;
      height: 72px;
      display: block;
      filter: drop-shadow(0 4px 12px rgba(22,101,52,0.20));
    }

    .robo-cabeca {
      transform-origin: 40px 40px;
      animation: cabeca-gira 2s ease-in-out infinite;
    }

    @keyframes cabeca-gira {
      0%   { transform: rotate(0deg); }
      20%  { transform: rotate(-14deg); }
      50%  { transform: rotate(12deg); }
      80%  { transform: rotate(-8deg); }
      100% { transform: rotate(0deg); }
    }

    .robo-boca-seg {
      animation: boca-pulsa 1.2s ease-in-out infinite;
    }

    .robo-boca-seg:nth-child(2) { animation-delay: 0s; }
    .robo-boca-seg:nth-child(3) { animation-delay: 0.2s; }
    .robo-boca-seg:nth-child(4) { animation-delay: 0.4s; }

    @keyframes boca-pulsa {
      0%, 100% { opacity: 0.25; }
      50%       { opacity: 1; }
    }
  `]
})
export class RoboLoaderComponent {}
