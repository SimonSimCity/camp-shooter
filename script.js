var socket = io('http://localhost:8080');

var gravity = 9.8;
var bottomGround = 60;
var fps = 60

/* CLASSES */

class Character {
    constructor(id, left, health = 100) {
        this.id = id

        this.alive = true;
        this.shooting = 0;
        this.left = left || Math.floor(Math.random() * 750);
        this.bottom = bottomGround;
        this.top = 120;
        this.vSpeed = 0;
        this.hSpeed = 0;

        this.health = health;

        this.toLeft = this.left > 400;
    }

    hit() {
        this.health -= 10;

        if (this.health < 1) {
            this.alive = false;

            const character = this;
            setTimeout(function () {
                character.alive = true;
                character.health = 100;
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
        createEnemy(id, left, health) {
            var enemy = new Character(id, left, health);

            this.enemies[id] = enemy;
        },

        updateEnemy(id, remote) {
            const orig = this.enemies[id]

            if (orig === undefined) {
                return
            }

            Object.keys(remote).forEach((el) => {
                // Do not overwrite id because for every remote it's 'hero', 
                // while here we want it to be the socket id
                if (el === "id") {
                    return;
                }
                orig[el] = remote[el]
            });
        },

        removeEnemy(id) {
            delete this.enemies[id]
        },

        shoot(character) {
            if (!character.shooting) {
                character.shooting = 10;

                var x;
                var y = character.bottom + 50;

                if (character.toLeft) {
                    x = character.left - 8;
                } else {
                    x = character.left + 50;
                }

                this.bullets.push(new Bullet(x, y, character.toLeft, character.id))
            }
        },

        checkIfBulletHitsCharacter(bullet, character) {
            if (!character.alive) return false;

            if (bullet.left + 4 > character.left &&
                bullet.left + 4 < character.left + 50) {
                if (bullet.bottom + 3 > character.bottom &&
                    bullet.bottom + 3 < character.top) {

                    character.hit();
                    bullet.impact = 10;
                }
            }
        },

        updateView() {
            this.bullets.forEach(bullet => {
                if (bullet.impact) {
                    bullet.impact--
                    if (bullet.impact === 1) {
                        this.bullets.splice(this.bullets.indexOf(bullet), 1)
                    }
                } else {
                    if (bullet.toLeft) {
                        bullet.left -= 10;
                    }
                    else {
                        bullet.left += 10;
                    }

                    bullet.vSpeed -= 0.01
                    bullet.bottom += bullet.vSpeed

                    if (bullet.left > 800 || bullet.left < 0) {
                        this.bullets.splice(this.bullets.indexOf(bullet), 1)
                    } else {
                        this.checkIfBulletHitsCharacter(bullet, this.hero)

                        Object.values(this.enemies).forEach(enemy => {
                            this.checkIfBulletHitsCharacter(bullet, enemy)
                        })
                    }
                }
            });

            [this.hero, ...Object.values(this.enemies)].forEach(function (character) {
                if (!character.alive) return false;

                if (character.shooting) {
                    character.shooting--
                }

                // bottomGround ; gravity ; character.vSpeed
                character.vSpeed -= gravity / fps;
                character.bottom += character.vSpeed;

                if (character.bottom <= bottomGround && character.vSpeed < 0) {
                    character.vSpeed = 0;
                    character.bottom = bottomGround;
                }

                character.left += character.hSpeed;
                if (character.left < 0) {
                    character.left = 0;
                }

                if (character.left > 750) {
                    character.left = 750;
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
            left: this.hero.left,
            health: this.hero.health
        })

        requestAnimationFrame(() => {
            this.updateView()
        });
    }
})

/* FUNCTIONS */

function stopRunning(character) {
    character.hSpeed = 0;
}

function goLeft(character) {
    character.toLeft = true;
    character.hSpeed = -1;
}

function goRight(character) {
    character.toLeft = false;
    character.hSpeed = 1;
}

socket.on('connect', function () {
    console.info('Welcome', ' ', socket.id);
    socket.emit('token', 'qwerty');
});

socket.on('disconnect', function () {
    console.info('Connection lost', ' ', socket.id);
});

socket.on('data', function (data) {
    console.log(data);

    if (!data || !data.action) return false;

    switch (data.action) {
        case 'player':
            if (data.id) {
                game.createEnemy(data.id, data.left, data.health);
            }
            break;

        case 'shoot':
            if (data.id in game.enemies) {
                game.updateEnemy(game.enemies[data.id], data.character);
                game.shoot(game.enemies[data.id]);
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

document.addEventListener('keyup', function (e) {
    if (!game.hero.alive) {
        return;
    }

    switch (e.code) {
        case 'KeyA':
        case 'KeyD':
            stopRunning(game.hero);
            socket.emit('data', { action: 'update', character: game.hero })
            break;
    }
});

document.addEventListener('keydown', function (e) {
    if (!game.hero.alive) {
        return;
    }

    switch (e.code) {
        case 'KeyW':
            if (bottomGround === game.hero.bottom) {
                game.hero.vSpeed += 5;
                socket.emit('data', { action: 'update', character: game.hero })
            }
            break;

        case 'KeyA': /* left */
            goLeft(game.hero);
            socket.emit('data', { action: 'update', character: game.hero })
            break;

        case 'KeyD': /* right */
            goRight(game.hero)
            socket.emit('data', { action: 'update', character: game.hero })
            break;

        case 'KeyE':
            game.shoot(game.hero);
            socket.emit('data', { action: 'shoot', character: hero })
            break;        
    }
});

window.addEventListener('beforeunload', function () {
    socket.emit('data', { action: 'disconnect' })
})
