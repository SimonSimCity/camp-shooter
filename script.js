function Character(id) {
    this.alive = true;
    this.running = false;
    this.shooting = 0;
    this.left = Math.floor(Math.random() * 750);

    this.toLeft = this.left > 400;

    var html = `<div class="character" id="${id}" style="left: ${this.left}px"></div>`;

    this.$el = $(html)

    if (this.toLeft) {
        this.$el.addClass('toLeft');
    }

    $('#container').append(this.$el);
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

        /* TODO: createBullet */
    }
}


function goLeft(cha) {
    cha.toLeft = true;
    cha.$el.addClass('toLeft');

    cha.running = true;
}



$(document).ready(function() {
    
    var hero = new Character('hero');

    requestAnimationFrame(function() {
        update(hero);
    });

    $(document).keydown(function(e) {
        console.log(e.which);
        switch(e.which) {
            case 32: /* space */
                shoot(hero);
            break;
            case 37: /* left */
            break;
                goLeft(hero);
            case 38: /* up */
            break;

            case 39: /* right */
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