import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryComponent } from './inventory.component';

describe('InventoryComponent', () => {
  let fixture: ComponentFixture<InventoryComponent>;
  let component: InventoryComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(InventoryComponent);
    component = fixture.componentInstance;
  });

  it('shows "Empty-handed" when items is empty', () => {
    component.items = [];
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Empty-handed');
  });

  it('shows each item name when items has entries', () => {
    component.items = ['sword', 'lantern'];
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('sword');
    expect(el.textContent).toContain('lantern');
  });

  it('renders no .inv-item elements when items is empty', () => {
    component.items = [];
    fixture.detectChanges();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.inv-item');
    expect(items.length).toBe(0);
  });

  it('renders one .inv-item per item when items has entries', () => {
    component.items = ['sword', 'lantern'];
    fixture.detectChanges();
    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.inv-item');
    expect(items.length).toBe(2);
  });
});
