import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameState } from '../../engine/types';

export interface TranscriptLine {
  type: 'input' | 'response';
  text: string;
}

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.css',
})
export class TerminalComponent implements AfterViewChecked, AfterViewInit {
  @Input() gameState: GameState | null = null;
  @Input() roomName = '';
  @Output() command = new EventEmitter<string>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  theme: 'amber' | 'green' = (localStorage.getItem('zork1-theme') as 'amber' | 'green') ?? 'amber';
  fontSize: number = Number(localStorage.getItem('zork1-font-size')) || 14;

  transcript: TranscriptLine[] = [];
  inputValue = '';

  private readonly COMPLETIONS = [
    'brief', 'close', 'down', 'drop', 'east', 'examine',
    'get', 'go', 'in', 'inventory', 'land', 'look',
    'ne', 'north', 'nw', 'open', 'out', 'quit',
    'read', 'restore', 'save', 'saves', 'score',
    'se', 'south', 'sw', 'take', 'undo', 'up',
    'verbose', 'wait', 'walk', 'west',
  ];
  private tabMatches: string[] = [];
  private tabIndex = -1;

  private shouldScroll = false;
  private cmdHistory: string[] = [];
  private historyIndex = -1;
  private draft = '';

  toggleTheme(): void {
    this.theme = this.theme === 'amber' ? 'green' : 'amber';
    localStorage.setItem('zork1-theme', this.theme);
  }

  increaseFontSize(): void {
    if (this.fontSize < 20) {
      this.fontSize += 2;
      localStorage.setItem('zork1-font-size', String(this.fontSize));
    }
  }

  decreaseFontSize(): void {
    if (this.fontSize > 10) {
      this.fontSize -= 2;
      localStorage.setItem('zork1-font-size', String(this.fontSize));
    }
  }

  addResponse(text: string): void {
    this.transcript.push({ type: 'response', text });
    this.shouldScroll = true;
  }

  submit(): void {
    this.tabMatches = [];
    this.tabIndex = -1;
    const cmd = this.inputValue.trim();
    if (!cmd) return;
    this.cmdHistory.push(cmd);
    this.historyIndex = -1;
    this.draft = '';
    this.transcript.push({ type: 'input', text: cmd });
    this.inputValue = '';
    this.shouldScroll = true;
    this.command.emit(cmd);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.submit();
    } else if (event.key === 'ArrowUp') {
      this.tabMatches = [];
      this.tabIndex = -1;
      if (this.cmdHistory.length === 0) return;
      if (this.historyIndex === -1) this.draft = this.inputValue;
      this.historyIndex = Math.min(this.historyIndex + 1, this.cmdHistory.length - 1);
      this.inputValue = this.cmdHistory[this.cmdHistory.length - 1 - this.historyIndex];
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      this.tabMatches = [];
      this.tabIndex = -1;
      if (this.historyIndex <= 0) {
        if (this.historyIndex === 0) {
          this.historyIndex = -1;
          this.inputValue = this.draft;
          event.preventDefault();
        }
        return;
      }
      this.historyIndex--;
      this.inputValue = this.cmdHistory[this.cmdHistory.length - 1 - this.historyIndex];
      event.preventDefault();
    } else if (event.ctrlKey && event.key === 'l') {
      event.preventDefault();
      this.transcript = [];
    } else if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.command.emit('save');
    } else if (event.ctrlKey && event.key === 'z') {
      event.preventDefault();
      this.command.emit('undo');
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const raw = this.inputValue;
      if (!raw.trim()) return;

      const prefix = raw.toLowerCase();
      if (this.tabMatches.length === 0 || !this.tabMatches[this.tabIndex]?.startsWith(prefix)) {
        this.tabMatches = this.COMPLETIONS.filter(w => w.startsWith(prefix));
        this.tabIndex = -1;
      }
      if (this.tabMatches.length === 0) return;
      this.tabIndex = (this.tabIndex + 1) % this.tabMatches.length;
      this.inputValue = this.tabMatches[this.tabIndex];
      return;
    }
  }

  ngAfterViewInit(): void {
    this.inputEl.nativeElement.focus();
  }

  @HostListener('click')
  focusInput(): void {
    this.inputEl.nativeElement.focus();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {
      // container not yet rendered
    }
  }
}
