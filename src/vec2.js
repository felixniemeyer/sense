
export default class Vec2 {
  constructor(x, y) {
    this.set(x,y) 
  }

  set(x,y) {
    this.x = x
    this.y = y
  }

  scaleInPlace(f) {
    this.x *= f
    this.y *= f
    return this
  }

  scale(f) {
    return new Vec2(
      this.x * f,
      this.y * f
    )
  }

  addInPlace(vec) {
    this.x += vec.x
    this.y += vec.y
    return this
  }
  
  add(vec) {
    return new Vec2(
      this.x + vec.x,
      this.y + vec.y
    )
  }

  subtractInPlace(vec) {
    this.x -= vec.x
    this.y -= vec.y
    return this
  }
  
  subtract(vec) {
    return new Vec2(
      this.x - vec.x,
      this.y - vec.y
    )
  }

  copy() {
    return new Vec2(
      this.x, 
      this.y
    )
  }

  length() {
    return Math.sqrt(
      Math.pow(this.x, 2) + 
      Math.pow(this.y, 2)
    ) 
  }

  normed() {
    console.log('hey', this) 
    return this.scale(1 / this.length()) 
  }

  cosWith(vec) {
    return (this.x * vec.x + this.y * vec.y) / (this.length() * vec.length())
  }

  toArray() {
    return [
      this.x, 
      this.y
    ]
  }

  divideCompWise(vec) {
    return new Vec2(
      this.x / vec.x, 
      this.y / vec.y
    )
  }
  
  floor(vec) {
    return new Vec2(
      Math.floor(this.x),
      Math.floor(this.y) 
    )
  }

  sign() {
    return new Vec2(
      Math.sign(this.x), 
      Math.sign(this.y) 
    )
  }

  toStr() {
    return `(${this.x}, ${this.y})`
  }

  divideBy(d) {
    return new Vec2(
      this.x / d, 
      this.y / d
    )
  }
}
