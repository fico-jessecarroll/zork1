import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-compass',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compass.component.html',
  styleUrl: './compass.component.css',
})
export class CompassComponent {
  @Input() exits: string[] = [];
  isOpen = true;
  toggle(): void { this.isOpen = !this.isOpen; }

  isAvailable(dir: string): boolean {
    return this.exits.includes(dir);
  }
}
