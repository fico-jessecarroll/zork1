import { Component, ViewChild, OnInit } from '@angular/core';
import { TerminalComponent } from './terminal/terminal.component';
import { CheatSheetComponent } from './cheat-sheet/cheat-sheet.component';
import { HintsComponent } from './hints/hints.component';
import { SaveSlotsComponent } from './save-slots/save-slots.component';
import { GameService, SlotInfo } from './game.service';
import { AudioService } from './audio.service';
import { GameState } from '../engine/types';
import { rooms } from '../engine/data/rooms';

const ROOM_NAME_MAP = new Map<string, string>(
  rooms.map(r => [r.id.toUpperCase(), r.desc])
);

@Component({
  selector: 'app-root',
  imports: [TerminalComponent, CheatSheetComponent, HintsComponent, SaveSlotsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  @ViewChild('terminal') private terminal!: TerminalComponent;

  protected readonly game = new GameService();
  protected readonly audio = new AudioService();

  get roomId(): string { return this.game.getState().here; }

  get gameState(): GameState {
    const s = this.game.getState();
    return { objectLocations: new Map(), flagOverrides: new Map(), score: s.score, moves: s.moves, winner: '', here: s.here };
  }
  get roomName() { return ROOM_NAME_MAP.get(this.game.getState().here) ?? this.game.getState().here; }
  get saveSlots(): SlotInfo[] { return this.game.listSlotsData(); }
  get isMuted(): boolean { return this.audio.isMuted(); }

  ngOnInit(): void {
    setTimeout(() => {
      const lines = this.game.processCommand('look');
      lines.forEach(l => this.terminal.addResponse(l));
    });
  }

  onCommand(cmd: string): void {
    this.audio.enable();
    const lines = this.game.processCommand(cmd);
    lines.forEach(l => this.terminal.addResponse(l));
    this.audio.playRoom(this.game.getState().here);
  }

  onRestoreSlot(slotName: string): void {
    const lines = this.game.processCommand('restore ' + slotName);
    lines.forEach(l => this.terminal.addResponse(l));
    if (lines[0] === 'Restored.') {
      const [, roomDesc] = [null, this.game.processCommand('look')[0]];
      this.terminal.addResponse(roomDesc);
      this.audio.playRoom(this.game.getState().here);
    }
  }

  toggleMute(): void {
    this.audio.toggle();
  }
}
