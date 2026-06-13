import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HINTS } from './hints-data';

@Component({
  selector: 'app-hints',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hints.component.html',
  styleUrl: './hints.component.css',
})
export class HintsComponent {
  @Input() roomId = '';

  isOpen = false;
  revealedCount = 0;

  get hints(): string[] {
    return HINTS.get(this.roomId) ?? [];
  }

  get hasHints(): boolean {
    return this.hints.length > 0;
  }

  get canRevealMore(): boolean {
    return this.revealedCount < this.hints.length;
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.revealedCount = 0;
    }
  }

  revealNext(): void {
    if (this.canRevealMore) {
      this.revealedCount++;
    }
  }
}
