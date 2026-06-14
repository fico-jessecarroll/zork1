import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-exits',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exits.component.html',
  styleUrl: './exits.component.css',
})
export class ExitsComponent {
  @Input() exits: string[] = [];

  abbrev(dir: string): string {
    const MAP: Record<string, string> = {
      north: 'N', south: 'S', east: 'E', west: 'W',
      ne: 'NE', nw: 'NW', se: 'SE', sw: 'SW',
      up: 'U', down: 'D', in: 'IN', out: 'OUT', land: 'LAND',
    };
    return MAP[dir.toLowerCase()] ?? dir.toUpperCase();
  }
}
