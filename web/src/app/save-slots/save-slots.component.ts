import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlotInfo } from '../game.service';

@Component({
  selector: 'app-save-slots',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './save-slots.component.html',
  styleUrl: './save-slots.component.css',
})
export class SaveSlotsComponent {
  @Input() slots: SlotInfo[] = [];
  @Output() restoreSlot = new EventEmitter<string>();

  isOpen = false;

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  formatDate(timestamp: number): string {
    if (timestamp === 0) return 'migrated';
    return new Date(timestamp).toLocaleString();
  }
}
