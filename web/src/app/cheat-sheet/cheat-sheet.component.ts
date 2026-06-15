import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CommandSection {
  heading: string;
  rows: { cmd: string; desc: string }[];
}

@Component({
  selector: 'app-cheat-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cheat-sheet.component.html',
  styleUrl: './cheat-sheet.component.css',
})
export class CheatSheetComponent {
  isOpen = true;
  toggle(): void { this.isOpen = !this.isOpen; }

  readonly sections: CommandSection[] = [
    {
      heading: 'Movement',
      rows: [
        { cmd: 'n / s / e / w', desc: 'cardinal directions' },
        { cmd: 'u / d', desc: 'up / down' },
        { cmd: 'in / out', desc: 'enter / exit' },
        { cmd: 'look  (l)', desc: 'describe room' },
      ],
    },
    {
      heading: 'Objects',
      rows: [
        { cmd: 'take <item>', desc: 'pick up' },
        { cmd: 'drop <item>', desc: 'put down' },
        { cmd: 'examine <item>', desc: 'inspect (x)' },
        { cmd: 'open <item>', desc: 'open it' },
        { cmd: 'close <item>', desc: 'close it' },
        { cmd: 'read <item>', desc: 'read text' },
        { cmd: 'inventory', desc: 'list carried (i)' },
      ],
    },
    {
      heading: 'Meta',
      rows: [
        { cmd: 'score', desc: 'show score' },
        { cmd: 'save', desc: 'save game' },
        { cmd: 'restore', desc: 'load save' },
        { cmd: 'undo', desc: 'undo last move' },
        { cmd: 'wait  (z)', desc: 'pass a turn' },
        { cmd: 'quit  (q)', desc: 'end game' },
      ],
    },
  ];
}
