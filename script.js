var socket = io('https://pchat.day4.live');

var gravity = 9.8;
var bottomGround = 60;
var fps = 60

/* CLASSES */

class Character {
    constructor(id, left) {
        this.id = id

        this.alive = true;
        this.shooting = 0;
        this.left = left || Math.floor(Math.random() * 750);
        this.bottom = bottomGround;
        this.top = 120;
        this.vSpeed = 0;
        this.hSpeed = 0;

        this.health = 100;

        this.toLeft = this.left > 400;
    }

    hit() {
        this.health -= 10;

        if (this.health < 1) {
            this.alive = false

            var cha = this
            setTimeout(function () {
                cha.alive = true;
                cha.health = 100;
            }, 5000)
        }
    }
}

class Bullet {
    constructor(x, y, toLeft, id) {
        // TODO: Add horizontal speed ...
        this.left = x;
        this.bottom = y;
        this.vSpeed = 0;
        this.toLeft = toLeft;
        this.impact = 0;
    }
}

const game = new Vue({
    el: '#game',
    data: {
        headline: 'Welcome to our Game!',
        hero: new Character('hero'),
        enemies: {},
        bullets: [],
    },

    methods: {
        createEnemy(id, left) {
            var enemy = new Character(id, left);
            // update(enemy)

            this.enemies[id] = enemy;
        },

        updateEnemy(id, remote) {
            const orig = this.enemies[id]

            if (orig === undefined) {
                return
            }

            Object.keys(remote).forEach((el) => {
                orig[el] = remote[el]
            })

            console.log(id, orig.vSpeed)
        },

        removeEnemy(id) {
            delete this.enemies[id]
        },
        
        shoot(cha) {
            if (!cha.shooting) {
                cha.shooting = 10;
        
                var x;
                var y = cha.bottom + 50;
        
                if (cha.toLeft) {
                    x = cha.left - 8;
                } else {
                    x = cha.left + 50;
                }
        
                this.bullets.push(new Bullet(x, y, cha.toLeft, cha.id))
            }
        },

        updateView() {
            this.bullets.forEach(b => {
                if (b.impact) {
                    b.impact--
                    if (b.impact === 1) {
                        this.bullets.splice(this.bullets.indexOf(b), 1)
                    }
                } else {
                    if (b.toLeft) {
                        b.left -= 10;
                    }
                    else {
                        b.left += 10;
                    }
    
                    b.vSpeed -= 0.01
                    b.bottom += b.vSpeed
    
                    if (b.left > 800 || b.left < 0) {
                        this.bullets.splice(this.bullets.indexOf(b), 1)
                    } else {
                        isHit(b, this.hero)
                        
                        Object.values(this.enemies).forEach(e => {
                            isHit(b, e)
                        })
                    }
                }
            });

            [this.hero, ...Object.values(this.enemies)].forEach(function (cha) {
                if (!cha.alive) return false;
            
                if (cha.shooting) {
                    cha.shooting--
                }
            
                // bottomGround ; gravity ; cha.vSpeed
                cha.vSpeed -= gravity / fps;
                cha.bottom += cha.vSpeed;
            
                if (cha.bottom <= bottomGround && cha.vSpeed < 0) {
                    cha.vSpeed = 0;
                    cha.bottom = bottomGround;
                }
                            
                cha.left += cha.hSpeed;
                if (cha.left < 0) {
                    cha.left = 0;
                }
            
                if (cha.left > 750) {
                    cha.left = 750;
                }
            })

            requestAnimationFrame(() => {
                this.updateView()
            });    
        }
    },

    mounted() {
        socket.emit('data', {
            id: socket.id,
            action: 'player',
            left: this.hero.left
        })

        requestAnimationFrame(() => {
            this.updateView()
        });
    }
})

/* FUNCTIONS */

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

function stopRunning(cha) {
    cha.hSpeed = 0;
}

function goLeft(cha) {
    cha.toLeft = true;
    cha.hSpeed = -1;
}

function goRight(cha) {
    cha.toLeft = false;
    cha.hSpeed = 1;
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
                game.createEnemy(data.id, data.left);
            }
            break;

        case 'shoot':
            if (data.id in $enemies) {
                updateEnemy($enemies[data.id], data.character);
                shoot($enemies[data.id]);
            }
            break;

        case 'update':
            game.updateEnemy(data.id, data.character);
            break;

        case 'disconnect':
            game.removeEnemy(data.id)
            break;
    }
});

document.addEventListener('keyup', function(e) {
    switch(e.which) {
        case 65: 
        case 68:
            stopRunning(game.hero);
            socket.emit('data', { action: 'update', character: game.hero })
            break;
    }
});

document.addEventListener('keydown', function(e) {
    switch(e.which) {
        case 32:
            game.hero.vSpeed += 5;
            socket.emit('data', { action: 'update', character: game.hero })
            break;

        case 65: /* left */
            goLeft(game.hero);
            socket.emit('data', { action: 'update', character: game.hero })
            break;

        case 68: /* right */
            goRight(game.hero)
            socket.emit('data', { action: 'update', character: game.hero })
            break;
    }
});

document.addEventListener('mousedown', function (e) {
    shoot(game.hero);
    socket.emit('data', { action: 'shoot', character: hero })
})

window.addEventListener('beforeunload', function () {
    socket.emit('data', { action: 'disconnect' })
})
