/* CLASSES */

function Character(id) {
    this.id = id

    this.alive = true;
    this.running = false;
    this.shooting = 0;
    this.left = Math.floor(Math.random() * 750);
    this.bottom = 60

    this.toLeft = this.left > 400;

    var html = `<div class="character" id="${id}" style="left: ${this.left}px; bottom: ${this.bottom}px"></div>`;

    addToContainer(this, html);
}

function Bullet(x, y, toLeft, id) {
    this.left = x;
    this.bottom = y;
    this.toLeft = toLeft;

    var html = `<div class="bullet" style="left: ${this.left}px; bottom: ${this.bottom}px"></div>`;

    addToContainer(this, html);

    this.run = function() {
        if (this.toLeft) this.left -= 10;
        else this.left += 10;

        if (this.left > 800 || this.left < 0) {
            this.$el.remove();
        } else {
            this.$el.css('left', this.left + 'px');

            requestAnimationFrame(this.run.bind(this))
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

var enemies = {}
function createEnemy(id) {
    var enemy = new Character(id);

    enemy.$el.addClass('purple');

    enemies[id] = enemy;
}

function update(cha) {
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

        console.log(cha.left)

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

        /* TODO: createBullet */
        if (cha.toLeft) new Bullet(cha.left - 8, cha.bottom + 50, true, cha.id)
        else new Bullet(cha.left + 50, cha.bottom + 50, false, cha.id)
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



$(document).ready(function() {
    
    var hero = new Character('hero');

    requestAnimationFrame(function() {
        update(hero);
    });

    $(document).keyup(function(e) {
        console.log(e.which);
        switch(e.which) {
            case 37: 
            case 39: stopRunning(hero);
            break;
        }
    });

    $(document).keydown(function(e) {
        console.log(e.which);
        switch(e.which) {
            case 32: /* space */
                shoot(hero);
            break;
            case 37: /* left */
                goLeft(hero);
            break;
            case 38: /* up */
            break;

            case 39: /* right */
                goRight(hero)
            break;

            case 40: /* down */
            break;

            default: return; /* exit this handler for other keys */
        }
        e.preventDefault(); /* prevent the default action (scroll / move caret) */
    });

    /* TEST */
    createEnemy('qwert123');

});