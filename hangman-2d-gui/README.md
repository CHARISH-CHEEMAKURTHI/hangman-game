# Hangman - 2D GUI Edition

A 2D graphical version of Hangman built with [Pygame](https://www.pygame.org/).

## Features

- Graphical hangman figure that is drawn piece by piece as you make wrong guesses
- On-screen clickable keyboard (green = correct guess, red = wrong guess)
- Keyboard input support (press any letter key to guess)
- Press `R` at any time to start a new round with a new random word

## Setup

```bash
pip install -r requirements.txt
python hangman.py
```

## How to play

- Guess letters by clicking the on-screen keyboard or pressing letter keys.
- You have 6 attempts before the hangman drawing is complete.
- Guess all the letters in the word before you run out of attempts to win.
