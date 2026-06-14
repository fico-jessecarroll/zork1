import { Component, ViewChild, OnInit } from '@angular/core';
import { TerminalComponent } from './terminal/terminal.component';
import { CheatSheetComponent } from './cheat-sheet/cheat-sheet.component';
import { HintsComponent } from './hints/hints.component';
import { SaveSlotsComponent } from './save-slots/save-slots.component';
import { InventoryComponent } from './inventory/inventory.component';
import { ExitsComponent } from './exits/exits.component';
import { CompassComponent } from './compass/compass.component';
import { GameService, SlotInfo } from './game.service';
import { AudioService } from './audio.service';
import { GameState } from '../engine/types';
import { rooms } from '../engine/data/rooms';

const ROOM_NAME_MAP = new Map<string, string>(
  rooms.map(r => [r.id.toUpperCase(), r.desc])
);

@Component({
  selector: 'app-root',
  imports: [TerminalComponent, CheatSheetComponent, HintsComponent, SaveSlotsComponent, InventoryComponent, ExitsComponent, CompassComponent],
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
  get exits(): string[] { return this.game.getExits(); }
  get inventory(): string[] { return this.game.getInventory(); }
  get isMuted(): boolean { return this.audio.isMuted(); }

  ngOnInit(): void {
    setTimeout(() => {
      const splash = [
        'ZORK I: The Great Underground Empire',
        'Copyright (c) 1981, 1982, 1983 Infocom, Inc. All rights reserved.',
        'ZORK is a registered trademark of Infocom, Inc.',
        'Revision 88 / Serial number 840726',
        '',
      ];
      splash.forEach(l => this.terminal.addResponse(l));
      if (this.game.hasAutoSave()) {
        this.game.restore('auto');
        this.terminal.addResponse('[Restored previous session.]');
      }
      const lines = this.game.processCommand('look');
      lines.forEach(l => this.terminal.addResponse(l));
    });
  }

  onCommand(cmd: string): void {
    this.audio.enable();
    const scoreBefore = this.game.getState().score;
    const lines = this.game.processCommand(cmd);
    lines.forEach(l => this.terminal.addResponse(l));
    const scoreAfter = this.game.getState().score;
    if (scoreAfter > scoreBefore) {
      const delta = scoreAfter - scoreBefore;
      this.terminal.addResponse(
        `[Your score just went up by ${delta} point${delta === 1 ? '' : 's'}!]`
      );
    }
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
