var socket = io('https://pchat.day4.live');

var $enemies = {}
var hero = null

var gravity = 9.8;
var bottomGround = 60;
var fps = 60

/* CLASSES */

function Character(id, left) {
    this.id = id

    this.alive = true;
    this.running = false;
    this.shooting = 0;
    this.left = left || Math.floor(Math.random() * 750);
    this.bottom = bottomGround;
    this.top = 120;
    this.vSpeed = 0;
    this.hSpeed = 0;

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
        setTimeout(function () {
            cha.alive = true;
            cha.$el.removeClass('dead');
            cha.health = 100;
            update(cha);
        }, 5000)
    }
}
Character.prototype.destroy = function() {
    this.$el.remove()
    delete $enemies[this.id]
}
Character.prototype.move = function(toLeft, left) {
    this.left = left

    if (this.toLeft !== left) {
        this.toLeft = left;
        this.$el.toggleClass('toLeft', toLeft);
    }

    this.$el.css('left', this.left + 'px');
}


function Bullet(x, y, toLeft, id) {
    this.left = x;
    this.bottom = y;
    this.vSpeed = 0;
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
            this.vSpeed -= 0.01
            this.bottom += this.vSpeed
            this.$el.css('bottom', this.bottom + 'px');

            if (this.left > 800 || this.left < 0) {
                this.$el.remove();
            } else {

                isHit(this, hero)
                
                var enemies = Object.values($enemies)
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
    update(enemy)
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
    }

    // bottomGround ; gravity ; cha.vSpeed
    cha.vSpeed -= gravity / fps;
    cha.bottom += cha.vSpeed;

    if (cha.bottom <= bottomGround) {
        cha.vSpeed = 0;
        cha.bottom = bottomGround;
    }

    cha.$el.css('bottom', cha.bottom + 'px');
    
    cha.left += cha.hSpeed;
    if (cha.left < 0) {
        cha.left = 0;
    }

    if (cha.left > 750) {
        cha.left = 750;
    }

    cha.$el.css('left', cha.left + 'px');

    requestAnimationFrame(function() {
        if (cha.alive) update(cha);
    });
}

function shoot(cha) {
    if (!cha.shooting) {
        cha.shooting = 10;
        cha.$el.addClass('isShooting');
        cha.$el.removeClass('isRunning');

        var x;
        var y = cha.bottom + 50;

        /* TODO: createBullet */
        if (cha.toLeft) {
            x = cha.left - 8;
        } else {
            x = cha.left + 50;
        }

        new Bullet(x, y, cha.toLeft, cha.id)
    }
}

function stopRunning(cha) {
    cha.running = false;
    cha.$el.removeClass('isRunning');
    cha.hSpeed = 0;
}


function goLeft(cha) {
    cha.running = true;
    cha.toLeft = true;
    cha.$el.addClass('isRunning');
    cha.$el.addClass('toLeft');
    cha.hSpeed = -1;
}

function goRight(cha) {
    cha.running = true;
    cha.toLeft = false;
    cha.$el.addClass('isRunning');
    cha.$el.removeClass('toLeft');
    cha.hSpeed = 1;
}

function updateEnemy(orig, remote) {
    orig.alive = remote.alive;
    orig.running = remote.running;
    orig.shooting = remote.shooting;
    orig.left = remote.left;
    orig.bottom = remote.bottom;
    orig.top = remote.top;
    orig.vSpeed = remote.vSpeed;
    orig.hSpeed = remote.hSpeed;
    orig.health = remote.health;
    orig.toLeft = remote.toLeft;

    if (orig.running) {
        orig.$el.addClass('isRunning');
    } else {
        orig.$el.removeClass('isRunning');
    }

    if (orig.toLeft) {
        orig.$el.addClass('toLeft');
    } else {
        orig.$el.removeClass('toLeft');
    }
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

    if (!data || !data.action) return false;

    switch(data.action) {
        case 'player':
            if (data.id) {
                createEnemy(data.id, data.left);
            }
            break;

        case 'shoot':
            if (data.id in $enemies) {
                updateEnemy($enemies[data.id], data.character);
                shoot($enemies[data.id]);
            }
            break;

        case 'update':
            if (data.id in $enemies) {
                updateEnemy($enemies[data.id], data.character);
            }
            break;

        case 'disconnect':
            if (data.id in $enemies) {
                $enemies[data.id].destroy();
            }
            break;
    }
});


$(document).ready(function() {
    
    hero = new Character('hero');

    requestAnimationFrame(function() {
        update(hero);
    });

    document.addEventListener('keyup', function(e) {
        switch(e.which) {
            case 65: 
            case 68:
                stopRunning(hero);
                socket.emit('data', { action: 'update', character: hero })
                break;
        }
    });

    document.addEventListener('keydown', function(e) {
        console.log(e);
        switch(e.which) {
            case 32:
                if (bottomGround === hero.bottom) {
                    hero.vSpeed += 5;
                    socket.emit('data', { action: 'update', character: hero })
                }
                break;

            case 65: /* left */
                goLeft(hero);
                socket.emit('data', { action: 'update', character: hero })
                break;

            case 68: /* right */
                goRight(hero)
                socket.emit('data', { action: 'update', character: hero })
                break;

            //case 
            default: return; /* exit this handler for other keys */
        }
        e.preventDefault(); /* prevent the default action (scroll / move caret) */
    });

    document.addEventListener('mousedown', function (e) {
        socket.emit('data', { action: 'shoot', character: hero })
        shoot(hero);
    })

    window.addEventListener('beforeunload', function () {
        socket.emit('data', { action: 'disconnect' })
    })

    socket.on('ok', function() {
        console.info('Auth!')
    })

    socket.emit('data', {
        id: socket.id,
        action: 'player',
        left: hero.left
    })
});