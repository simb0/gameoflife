const CELL = {
  DEAD: 0,
  ALIVE: 1
};

/**
 * The AnimtationController controls the drawing on the canvas.
 * The drawing function itself is passed from the Game class to the AnimtationController.
 */
class AnimationController {
  stop = false;
  frameCount = 0;
  fps;
  fpsInterval;
  startTime;
  now;
  then;
  elapsed;
  status;
  drawFunction;
  reqId;

  constructor(fps) {
    this.fps = fps;
  }

  startAnimating(drawFunction) {
    this.fpsInterval = 1000 / this.fps;
    this.then = window.performance.now();
    this.startTime = this.then;
    this.status = document.getElementById("status");
    this.drawFunction = drawFunction;
    this.animate();
  }


  animate(newTime) {

    if (this.stop) {
      return;
    }

    this.reqId = requestAnimationFrame(this.animate.bind(this));

    this.now = newTime;
    this.elapsed = this.now - this.then;

    if (this.elapsed > this.fpsInterval) {

      this.then = this.now - (this.elapsed % this.fpsInterval);

      // draw stuff here
      this.drawFunction();

      var sinceStart = this.now - this.startTime;
      var currentFps = Math.round(1000 / (sinceStart / ++this.frameCount) * 100) / 100;
      this.status.innerHTML = "Elapsed time= " + Math.round(sinceStart / 1000 * 100) / 100 + " secs @ " + currentFps + " fps.";

    }
  }

  destroy() {
    this.stop = true;
    window.cancelAnimationFrame(this.reqId);
  }
}

/**
 * The Charter takes care of drawing the chart.
 */
class Charter {
  chart;
  livingPoints = [];

  constructor() {
    this.chart = new CanvasJS.Chart("chart", {
      theme: "light2",
      backgroundColor: "#e0e5f1",
      title: {
        text: "Living Cells"
      },
      data: [{
        type: "line",
        dataPoints: this.livingPoints
      }]
    });
    this.addData(0, 0);
    this.chart.render();
  }

  addData(time, living, dead) {
    this.livingPoints.push({x: time, y: living});
    this.chart.render();
  }

}

class Game {
  ctx;
  canv;
  cellSize = 10;
  width;
  height;

  currentGen = [[], []];
  genCount = 0;
  livingCells = 0;
  deadCells = 0;

  cellColumns;
  cellRows;

  selectedY;
  selectedX;

  offsetX;
  offsetY;

  pause =  true;
  alreadyDrawed = false;

  animationController;

  gamestatus;
  charter;

  constructor(width, height, fps, cellSize) {
    this.cellSize = cellSize;
    this.animationController = new AnimationController(fps);

    this.canv = document.createElement('canvas');
    this.canv.id = 'game';
    this.canv.width = width + this.cellSize+10;
    this.canv.height = height + this.cellSize+10;
    this.width = width;
    this.height = height;

    this.gamestatus = document.getElementById("gamestatus");
    document.getElementById("gamefield").appendChild(this.canv);
    this.ctx = document.getElementById('game').getContext('2d');
    this.ctx.fillStyle = "#c0d2e0";
    this.ctx.fillRect(0, 0, this.canv.width, this.canv.height);

    this.charter = new Charter();
    this.initListeners();
    this.reOffset();
  }

  initListeners() {
    let _this = this;
    window.onscroll = function (e) {
      _this.reOffset();
    }
    window.onresize = function (e) {
      _this.reOffset();
    }
    document.getElementById('game').addEventListener("pointermove", function (e) {
      e.preventDefault();
      e.stopPropagation();
      _this.selectedX = Math.floor((e.clientX - _this.offsetX) / _this.cellSize);
      _this.selectedY = Math.floor((e.clientY - _this.offsetY) / _this.cellSize);

    });

    document.getElementById('game').addEventListener("mousedown", function (e) {
      _this.currentGen[_this.selectedX][_this.selectedY] = CELL.ALIVE;
    });

    document.getElementById("random").addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      _this.fillWithRandom();
    });

    document.getElementById("start").addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      _this.pause = false;
    });
  }

  reOffset() {
    var BB = this.canv.getBoundingClientRect();
    this.offsetX = BB.left;
    this.offsetY = BB.top;
  }

  init() {
    this.cellColumns = this.width / this.cellSize;
    this.cellRows = this.height / this.cellSize;
    for (var x = 0; x < this.cellColumns; x++) {
      this.currentGen[x] = [];
      for (var y = 0; y < this.cellRows; y++) {
        this.currentGen[x][y] = CELL.DEAD;
      }
    }
    this.animationController.startAnimating(this.drawBoard.bind(this));
  }

  fillWithRandom() {
    for (var x = 0; x < this.cellColumns; x++) {
      for (var y = 0; y < this.cellRows; y++) {
        this.currentGen[x][y] = (Math.random() < 0.5 == true ? CELL.ALIVE : CELL.DEAD);
      }
    }
  }

  update() {
    if(!this.pause) {
      var nextGen = this.lifeIteration();
      this.manifestIteration(nextGen);
      this.genCount++;
      this.charter.addData(this.genCount, this.livingCells, this.deadCells);
    }
  }

  lifeIteration() {
    var nextGen = [[], []];
    this.livingCells = 0;
    this.deadCells = 0;

    for (var x = 0; x < this.cellColumns; x++) {
      nextGen[x] = [];
      for (var y = 0; y < this.cellRows; y++) {
        nextGen[x][y] = CELL.DEAD;

        var cell = this.currentGen[x][y];
        var neigbhours = this.countNeighbours(x, y);
        if (cell == CELL.ALIVE) {
          if (neigbhours < 2) {
            nextGen[x][y] = CELL.DEAD;
          } else if (neigbhours == 2 || neigbhours == 3) {
            nextGen[x][y] = CELL.ALIVE;
          } else if (neigbhours > 3) {
            nextGen[x][y] = CELL.DEAD;
          }
          this.livingCells++;

        } else if (cell == CELL.DEAD) {
          if (neigbhours === 3) {
            nextGen[x][y] = CELL.ALIVE;
          }
          this.deadCells++;
        }
      }
    }
    return nextGen;
  }

  manifestIteration(nextGen) {
    for (var i = 0; i < nextGen.length; i++)
      this.currentGen[i] = nextGen[i].slice();

  }


  countNeighbours(x, y) {
    var c = 0;

    //Right
    if (x + 1 < this.cellColumns && this.currentGen[x + 1][y] == CELL.ALIVE) {
      c++;
    }
    // Left
    if (x - 1 >= 0 && this.currentGen[x - 1][y] == CELL.ALIVE) {
      c++;
    }
    //Top
    if (y - 1 >= 0 && this.currentGen[x][y - 1] == CELL.ALIVE) {
      c++;
    }
    //TopLeft
    if ((y - 1 >= 0 && x - 1 >= 0) && this.currentGen[x - 1][y - 1] == CELL.ALIVE) {
      c++;
    }
    //TopRight
    if ((y - 1 >= 0 && x + 1 < this.cellColumns) && this.currentGen[x + 1][y - 1] == CELL.ALIVE) {
      c++;
    }
    //Bottom
    if (y + 1 < this.cellRows && this.currentGen[x][y + 1] == CELL.ALIVE) {
      c++;
    }
    //BottomLeft
    if ((y + 1 < this.cellRows && x - 1 >= 0) && this.currentGen[x - 1][y + 1] == CELL.ALIVE) {
      c++;
    }
    //BottomRight
    if ((y + 1 < this.cellRows && x + 1 < this.cellColumns) && this.currentGen[x + 1][y + 1] == CELL.ALIVE) {
      c++;
    }

    return c;
  }

  drawBoard() {
    const p = 5;
    const pWithSpacer = p + 0.5;

    if(!this.alreadyDrawed) {
      for (var x = 0; x <= this.width; x += this.cellSize) {
        this.ctx.moveTo(pWithSpacer + x, p);
        this.ctx.lineTo(pWithSpacer + x, this.height + p);
        console.log("25")
      }

      for (var y = 0; y <= this.height; y += this.cellSize) {
        this.ctx.moveTo(p, pWithSpacer + y);
        this.ctx.lineTo(this.width + p, pWithSpacer + y);
      }
      this.alreadyDrawed = true;
    }

    this.ctx.strokeStyle = "black";
    this.ctx.stroke();

    var xpos;
    var ypos;
    for (var x = 0; x < this.cellColumns; x++) {
      for (var y = 0; y < this.cellRows; y++) {
        this.ctx.fillStyle = "#c4d7db";
        if (this.currentGen[x][y] === CELL.ALIVE) {
          this.ctx.fillStyle = "green";
        }

        //Mouseover
        if (x == this.selectedX && y == this.selectedY) {
          this.ctx.fillStyle = "blue";
        }

        xpos = x * this.cellSize + pWithSpacer;
        ypos = y * this.cellSize + pWithSpacer;
        this.ctx.fillRect(xpos, ypos, this.cellSize, this.cellSize);
      }
    }
    this.update();
    this.gamestatus.innerHTML = `Generation: ${this.genCount} Cells: ${this.cellColumns * this.cellRows} Current living cells: ${this.livingCells} Current dead cells: ${this.deadCells}`;
  }

  destroy() {
    this.canv = null;
    this.ctx = null;
    this.cellSize = null;
    this.width = null;
    this.currentGen = null;
    this.animationController.destroy();
    this.animationController = null;
    this.height = null;
    this.selectedY = null;
    this.selectedX = null;
    this.offsetX = null;
    this.offsetY = null;
    this.cellRows = null;
    this.cellColumns = null;
  }

}

var reload = document.getElementById("reload");
var slider = document.getElementById("fps");
var fps = document.getElementById("fpslabel");
var g = new Game(parseInt(document.getElementById("width").value), parseInt(document.getElementById("height").value), parseInt(fps.textContent.replace("fps")), parseInt(document.getElementById("cellsize").value));
g.init();

slider.oninput = function() {
  fps.innerHTML = this.value+"fps";
  reload.disabled = false;
  reload.style.background = "lightblue";
}
document.getElementById("width").oninput = function () {
  reload.disabled = false;
  reload.style.background = "lightblue";
}
document.getElementById("height").oninput = function () {
  reload.disabled = false;
  reload.style.background = "lightblue";
}
document.getElementById("cellsize").oninput = function () {
  reload.disabled = false;
  reload.style.background = "lightblue";
}


reload.addEventListener("click", function () {
  if(document.getElementById("game")) {
    document.getElementById("gamefield").removeChild(document.getElementById("game"));
  }
  g.destroy();
  g = new Game(parseInt(document.getElementById("width").value), parseInt(document.getElementById("height").value), parseInt(fps.textContent.replace("fps")), parseInt(document.getElementById("cellsize").value));
  g.init();
  reload.disabled = true;
  reload.style.background = "";
});

