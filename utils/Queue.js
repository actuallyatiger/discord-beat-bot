module.exports = class Queue {
  constructor(song) {
    if (song) {
      this.queue = [song];
    } else {
      this.queue = [];
    }
  }

  add(...songs) {
    this.queue.push(...songs);
  }

  next() {
    return this.queue.shift();
  }

  insert(pos, ...songs) {
    this.queue.splice(pos, 0, ...songs);
  }

  remove(pos) {
    return this.queue.splice(pos, 1)[0];
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

  skipto(pos, readd = false) {
    const removed = this.queue.splice(0, pos - 1);
    if (readd) {
      this.queue.push(...removed);
    }
  }
};
