module.exports = class Queue {
  constructor(song) {
    if (song) {
      this.queue = [song];
    } else {
      this.queue = [];
    }
    this.connection = null;
  }

  push(song) {
    this.queue.push(song);
  }

  pop(song) {
    this.queue.pop(song);
  }

  insert(song, pos) {
    this.queue.splice(pos, 0, song);
  }

  remove(pos) {
    this.queue.splice(pos, 1);
  }

  get(count = 5) {
    return this.queue.slice(0, count);
  }
};
