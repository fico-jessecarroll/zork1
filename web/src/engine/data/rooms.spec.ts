import { rooms, Room, RoomId } from './rooms';

function getRoom(id: RoomId): Room {
  const room = rooms.find(r => r.id === id);
  if (!room) throw new Error(`Room not found: ${id}`);
  return room;
}

describe('rooms data', () => {
  it('contains exactly 110 rooms', () => {
    expect(rooms).toHaveLength(110);
  });

  it('has no duplicate room ids', () => {
    const ids = rooms.map(r => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  describe('west-of-house', () => {
    it('has 8 exits', () => {
      expect(getRoom('west-of-house').exits).toHaveLength(8);
    });

    it('has flags RLANDBIT ONBIT SACREDBIT', () => {
      expect(getRoom('west-of-house').flags).toEqual(
        expect.arrayContaining(['RLANDBIT', 'ONBIT', 'SACREDBIT'])
      );
    });

    it('east exit is a message (door boarded)', () => {
      const exit = getRoom('west-of-house').exits.find(e => e.direction === 'east');
      expect(exit).toBeDefined();
      expect(exit).toHaveProperty('message');
      expect((exit as { message: string }).message).toMatch(/boarded/i);
    });

    it('sw exit is conditional on WON-FLAG', () => {
      const exit = getRoom('west-of-house').exits.find(e => e.direction === 'sw');
      expect(exit).toBeDefined();
      expect(exit).toHaveProperty('condition', 'WON-FLAG');
      expect(exit).toHaveProperty('destination', 'stone-barrow');
    });
  });

  describe('troll-room', () => {
    it('has 3 exits', () => {
      expect(getRoom('troll-room').exits).toHaveLength(3);
    });

    it('has only RLANDBIT flag', () => {
      expect(getRoom('troll-room').flags).toEqual(['RLANDBIT']);
    });

    it('east and west exits are gated by TROLL-FLAG', () => {
      const room = getRoom('troll-room');
      const east = room.exits.find(e => e.direction === 'east');
      const west = room.exits.find(e => e.direction === 'west');
      expect(east).toHaveProperty('condition', 'TROLL-FLAG');
      expect(west).toHaveProperty('condition', 'TROLL-FLAG');
    });
  });

  describe('maze-5', () => {
    it('has 3 exits', () => {
      expect(getRoom('maze-5').exits).toHaveLength(3);
    });

    it('has RLANDBIT and MAZEBIT flags', () => {
      expect(getRoom('maze-5').flags).toEqual(
        expect.arrayContaining(['RLANDBIT', 'MAZEBIT'])
      );
    });
  });

  describe('living-room', () => {
    it('has 3 exits', () => {
      expect(getRoom('living-room').exits).toHaveLength(3);
    });

    it('has RLANDBIT ONBIT SACREDBIT flags', () => {
      expect(getRoom('living-room').flags).toEqual(
        expect.arrayContaining(['RLANDBIT', 'ONBIT', 'SACREDBIT'])
      );
    });

    it('west exit is conditional on MAGIC-FLAG leading to strange-passage', () => {
      const exit = getRoom('living-room').exits.find(e => e.direction === 'west');
      expect(exit).toHaveProperty('condition', 'MAGIC-FLAG');
      expect(exit).toHaveProperty('destination', 'strange-passage');
    });
  });

  describe('reservoir', () => {
    it('has 5 exits', () => {
      expect(getRoom('reservoir').exits).toHaveLength(5);
    });

    it('has NONLANDBIT flag', () => {
      expect(getRoom('reservoir').flags).toContain('NONLANDBIT');
    });

    it('does not have RLANDBIT flag', () => {
      expect(getRoom('reservoir').flags).not.toContain('RLANDBIT');
    });

    it('down exit is a message (dam blocks way)', () => {
      const exit = getRoom('reservoir').exits.find(e => e.direction === 'down');
      expect(exit).toHaveProperty('message');
    });
  });

  describe('grating-room', () => {
    it('has 2 exits', () => {
      expect(getRoom('grating-room').exits).toHaveLength(2);
    });

    it('has only RLANDBIT flag', () => {
      expect(getRoom('grating-room').flags).toEqual(['RLANDBIT']);
    });

    it('up exit requires GRATE IS OPEN to reach grating-clearing', () => {
      const exit = getRoom('grating-room').exits.find(e => e.direction === 'up');
      expect(exit).toHaveProperty('condition', 'GRATE IS OPEN');
      expect(exit).toHaveProperty('destination', 'grating-clearing');
    });
  });
});
