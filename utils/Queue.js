module.exports = class Queue {
  constructor(song) {
    if (song) {
      this.queue = [song];
    } else {
      this.queue = [];
    }
    this.connection = null;
  }

  add(song) {
    this.queue.push(song);
  }

  next() {
    return this.queue.shift();
  }

  insert(song, pos) {
    this.queue.splice(pos, 0, song);
  }

  remove(pos) {
    return this.queue.splice(pos, 1);
  }

  get(count = 10) {
    return this.queue.slice(0, count);
  }

  length() {
    return this.queue.length;
  }

  shuffle() {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  clear() {
    this.queue = [];
  }
};
