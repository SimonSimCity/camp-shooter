var socket = io('https://pchat.day4.live');

var enemies = []
var $enemies = {}
var hero = null

/* CLASSES */

function Character(id, left) {
    this.id = id

    this.alive = true;
    this.running = false;
    this.shooting = 0;
    this.left = left || Math.floor(Math.random() * 750);
    this.bottom = 60
    this.top = 120;

    this.health = 100;

    this.toLeft = this.left > 400;

    var html = `<div class="character" id="${id}" style="left: ${this.left}px; bottom: ${this.bottom}px"></div>`;

    addToContainer(this, html);

    $enemies[id] = this;
}
Character.prototype.hit = function() {
    this.health -= 10;

    if (this.health < 1) {
        this.alive = false

        this.$el.addClass('dead');

        var cha = this
        setTimeout(function() {
            cha.alive = true
            cha.$el.removeClass('dead')
            cha.health = 100
            update(cha);
        }, 5000)
    }
}
Character.prototype.destroy = function() {
    this.$el.remove()
    var i = enemies.indexOf(this)
    if (i > -1) {
        enemies.splice(i, 1);
    }
}
Character.prototype.move = function(toLeft, left) {
    this.left = left

    if (this.toLeft !== toLeft) {
        this.toLeft = toLeft
        this.$el.toggleClass('toLeft', toLeft)
    }

    this.$el.css('left', left + 'px');
}


function Bullet(x, y, toLeft, id) {
    this.left = x;
    this.bottom = y;
    this.toLeft = toLeft;
    this.impact = 0;

    var html = `<div class="bullet" style="left: ${this.left}px; bottom: ${this.bottom}px"></div>`;

    addToContainer(this, html);

    this.run = function() {
        if (this.impact) {
            if (this.impact-- === 1) this.$el.remove()
            else requestAnimationFrame(this.run.bind(this))
        } else {

            if (this.toLeft) this.left -= 10;
            else this.left += 10;

            if (this.left > 800 || this.left < 0) {
                this.$el.remove();
            } else {

                isHit(this, hero)
                
                for(var i = 0; i < enemies.length; i++) {
                    isHit(this, enemies[i])
                }
                

                this.$el.css('left', this.left + 'px');

                requestAnimationFrame(this.run.bind(this))
            }

        }
    }

    requestAnimationFrame(this.run.bind(this))
}


/* FUNCTIONS */

function addToContainer(obj, html) {
    obj.$el = $(html)

    if (obj.toLeft) {
        obj.$el.addClass('toLeft');
    }

    $('#container').append(obj.$el);
}

function createEnemy(id, left) {
    var enemy = new Character(id, left);

    enemy.$el.addClass('purple');

    enemies.push(enemy);
    update(enemy);
}

function isHit(bul, cha) {
    if (!cha.alive) return false;

    if (bul.left + 4 > cha.left && 
      bul.left + 4 < cha.left + 50) {
        if (bul.bottom + 3 > cha.bottom &&
          bul.bottom + 3 < cha.top) {

            cha.hit();
            bul.impact = 10;
        }
    }
}

function update(cha) {
    if (!cha.alive) return false;

    if (cha.shooting) {
        if(cha.shooting-- === 1) {
            cha.$el.removeClass('isShooting');
            if (cha.running) cha.$el.addClass('isRunning');
        }
    } else if (cha.running) {
        if (cha.toLeft) {
            cha.left -= 1;
        } else {
            cha.left += 1;
        }

        if (cha.left < 0) {
            cha.left = 0;
            cha.running = false;
            cha.$el.removeClass('isRunning')
        }

        if (cha.left > 750) {
            cha.left = 750;
            cha.running = false;
            cha.$el.removeClass('isRunning')
        }

        cha.$el.css('left', cha.left + 'px');
    }

    requestAnimationFrame(function() {
        if (cha.alive) update(cha);
    });
}

function shoot(cha) {
    if (!cha.shooting) {
        cha.shooting = 10;
        cha.$el.addClass('isShooting');
        cha.$el.removeClass('isRunning');

        var bul;
    
        if (cha.toLeft) bul = new Bullet(cha.left - 8, cha.bottom + 50, true, cha.id)
        else bul = new Bullet(cha.left + 50, cha.bottom + 50, false, cha.id)
    }
}

function stopRunning(cha) {
    cha.running = false;
    cha.$el.removeClass('isRunning');
}


function goLeft(cha) {
    cha.running = true;
    cha.toLeft = true;
    cha.$el.addClass('isRunning');
    cha.$el.addClass('toLeft');
}

function goRight(cha) {
    cha.running = true;
    cha.toLeft = false;
    cha.$el.addClass('isRunning');
    cha.$el.removeClass('toLeft');
}


socket.on('connect', function() {
    console.info('Welcome', ' ', socket.id);

    socket.emit('token', 'qwerty');
});

socket.on('disconnect', function() {
    console.info('Connection lost', ' ', socket.id);
});

socket.on('data', function(data){
    console.info(data);

    if (!data.action || !$enemies[data.id]) return false;

    switch(data.action) {
        case 'player': if (data.id && data.left) {
            createEnemy(data.id, data.left);
        }
        break;
        case 'left': enemies.forEach(function(enemy) {
            if (enemy.id === data.id) {
                enemy.destroy()
            }
        })
        break;
        case 'shoot': 
            shoot($enemies[data.id])
        break;
        case 'goLeft':
            goLeft($enemies[data.id])
        break;
        case 'goRight':
            goRight($enemies[data.id])
        break;
        case 'stopRunning':
            stopRunning($enemies[data.id])
        break;
    }

});


$(document).ready(function() {
    
    hero = new Character('hero');

    requestAnimationFrame(function() {
        update(hero);
    });

    $(document).keyup(function(e) {
        switch(e.which) {
            case 37: 
            case 39: 
                socket.emit('data', { action: 'stopRunning' })
                stopRunning(hero);
            break;
        }
    });

    $(document).keydown(function(e) {
        switch(e.which) {
            case 32: /* space */
                socket.emit('data', { action: 'shoot' })
                shoot(hero);
            break;
            case 37: /* left */
                socket.emit('data', { action: 'goLeft' })
                goLeft(hero);
            break;
            case 38: /* up */
                
            break;

            case 39: /* right */
                socket.emit('data', { action: 'goRight' })
                goRight(hero)
            break;

            case 40: /* down */
            break;

            default: return; /* exit this handler for other keys */
        }
        e.preventDefault(); /* prevent the default action (scroll / move caret) */
    });


    socket.on('info', function(msg) {
        console.info(msg)          
    });

    socket.emit('data', {
        id: socket.id,
        action: 'player',
        left: hero.left
    }) 

});