"""2D Hangman game with a graphical interface, built using Pygame."""
import random
import string
import sys

import pygame

WINDOW_WIDTH = 800
WINDOW_HEIGHT = 600
MAX_ATTEMPTS = 6

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (200, 200, 200)
GREEN = (46, 139, 87)
RED = (178, 34, 34)
BLUE = (30, 60, 120)

WORDS = [
    "python", "hangman", "keyboard", "pygame", "developer",
    "computer", "elephant", "guitar", "mountain", "sunshine",
]


class HangmanGame:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("Hangman - 2D GUI Edition")
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        self.clock = pygame.time.Clock()

        self.title_font = pygame.font.SysFont("arial", 40, bold=True)
        self.word_font = pygame.font.SysFont("consolas", 48, bold=True)
        self.letter_font = pygame.font.SysFont("arial", 24, bold=True)
        self.message_font = pygame.font.SysFont("arial", 28, bold=True)

        self.reset_game()

    def reset_game(self):
        self.word = random.choice(WORDS)
        self.guessed_letters = set()
        self.wrong_letters = set()
        self.attempts_left = MAX_ATTEMPTS
        self.game_over = False
        self.won = False
        self.letter_rects = self._build_letter_rects()

    def _build_letter_rects(self):
        rects = {}
        letters = string.ascii_lowercase
        cols = 13
        cell_w, cell_h = 50, 50
        start_x = (WINDOW_WIDTH - cols * cell_w) // 2
        start_y = 420
        for index, letter in enumerate(letters):
            row, col = divmod(index, cols)
            x = start_x + col * cell_w
            y = start_y + row * cell_h
            rects[letter] = pygame.Rect(x, y, cell_w - 6, cell_h - 6)
        return rects

    def draw_hangman(self):
        pole_x, pole_y = 120, 380
        pygame.draw.line(self.screen, BLACK, (pole_x - 40, pole_y), (pole_x + 60, pole_y), 4)
        pygame.draw.line(self.screen, BLACK, (pole_x, pole_y), (pole_x, 100), 4)
        pygame.draw.line(self.screen, BLACK, (pole_x, 100), (pole_x + 120, 100), 4)
        pygame.draw.line(self.screen, BLACK, (pole_x + 120, 100), (pole_x + 120, 140), 4)

        wrong = MAX_ATTEMPTS - self.attempts_left
        head_center = (pole_x + 120, 165)
        if wrong >= 1:
            pygame.draw.circle(self.screen, BLACK, head_center, 25, 3)
        if wrong >= 2:
            pygame.draw.line(self.screen, BLACK, (pole_x + 120, 190), (pole_x + 120, 260), 3)
        if wrong >= 3:
            pygame.draw.line(self.screen, BLACK, (pole_x + 120, 205), (pole_x + 90, 235), 3)
        if wrong >= 4:
            pygame.draw.line(self.screen, BLACK, (pole_x + 120, 205), (pole_x + 150, 235), 3)
        if wrong >= 5:
            pygame.draw.line(self.screen, BLACK, (pole_x + 120, 260), (pole_x + 95, 310), 3)
        if wrong >= 6:
            pygame.draw.line(self.screen, BLACK, (pole_x + 120, 260), (pole_x + 145, 310), 3)

    def draw_word(self):
        display = " ".join(
            letter if letter in self.guessed_letters else "_" for letter in self.word
        )
        text = self.word_font.render(display, True, BLACK)
        rect = text.get_rect(center=(WINDOW_WIDTH // 2, 340))
        self.screen.blit(text, rect)

    def draw_letters(self):
        for letter, rect in self.letter_rects.items():
            if letter in self.guessed_letters:
                color = GREEN if letter in self.word else RED
            else:
                color = GRAY
            pygame.draw.rect(self.screen, color, rect, border_radius=6)
            pygame.draw.rect(self.screen, BLACK, rect, 2, border_radius=6)
            text = self.letter_font.render(letter.upper(), True, BLACK)
            text_rect = text.get_rect(center=rect.center)
            self.screen.blit(text, text_rect)

    def draw_status(self):
        title = self.title_font.render("HANGMAN", True, BLUE)
        self.screen.blit(title, title.get_rect(center=(WINDOW_WIDTH // 2, 40)))

        attempts_text = self.message_font.render(
            f"Attempts left: {self.attempts_left}", True, BLACK
        )
        self.screen.blit(attempts_text, (20, 80))

        if self.game_over:
            if self.won:
                message = "You won! Press R to play again."
                color = GREEN
            else:
                message = f"You lost! The word was '{self.word}'. Press R to play again."
                color = RED
            text = self.message_font.render(message, True, color)
            self.screen.blit(text, text.get_rect(center=(WINDOW_WIDTH // 2, 550)))

    def handle_letter_guess(self, letter):
        if self.game_over or letter in self.guessed_letters:
            return
        self.guessed_letters.add(letter)
        if letter not in self.word:
            self.wrong_letters.add(letter)
            self.attempts_left -= 1

        if all(ch in self.guessed_letters for ch in self.word):
            self.game_over = True
            self.won = True
        elif self.attempts_left <= 0:
            self.game_over = True
            self.won = False

    def handle_click(self, pos):
        for letter, rect in self.letter_rects.items():
            if rect.collidepoint(pos):
                self.handle_letter_guess(letter)
                return

    def handle_keydown(self, key):
        if key == pygame.K_r:
            self.reset_game()
            return
        if pygame.K_a <= key <= pygame.K_z:
            letter = chr(key)
            self.handle_letter_guess(letter)

    def run(self):
        running = True
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.MOUSEBUTTONDOWN:
                    self.handle_click(event.pos)
                elif event.type == pygame.KEYDOWN:
                    self.handle_keydown(event.key)

            self.screen.fill(WHITE)
            self.draw_status()
            self.draw_hangman()
            self.draw_word()
            self.draw_letters()
            pygame.display.flip()
            self.clock.tick(30)

        pygame.quit()
        sys.exit()


def main():
    game = HangmanGame()
    game.run()


if __name__ == "__main__":
    main()
