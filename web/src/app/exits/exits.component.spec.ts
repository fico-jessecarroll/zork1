import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExitsComponent } from './exits.component';

describe('ExitsComponent', () => {
  let fixture: ComponentFixture<ExitsComponent>;
  let component: ExitsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ExitsComponent);
    component = fixture.componentInstance;
  });

  it('shows "None" when exits is empty', () => {
    component.exits = [];
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('None');
  });

  it('shows north and east when exits contains them', () => {
    component.exits = ['north', 'east'];
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('N');
    expect(el.textContent).toContain('E');
  });

  it('renders 2 exit elements when exits has 2 entries', () => {
    component.exits = ['north', 'east'];
    fixture.detectChanges();
    const tags = (fixture.nativeElement as HTMLElement).querySelectorAll('.exit-tag');
    expect(tags.length).toBe(2);
  });

  it('displays direction names in uppercase abbreviation', () => {
    component.exits = ['north', 'east'];
    fixture.detectChanges();
    const tags = (fixture.nativeElement as HTMLElement).querySelectorAll('.exit-tag');
    const texts = Array.from(tags).map(t => t.textContent?.trim());
    expect(texts).toContain('N');
    expect(texts).toContain('E');
  });
});
