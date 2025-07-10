import random as rd
for z in range(100):
    word1=["panda","tiger","zebra","lion","sloth"]
    word2=["grape","pineapple","corn","cherry","blueberry"]
    word3=["eagle","lovebird","sparrow","penguin","swan"]
    word4=["india","vaticancity","srilanka","myanmar","chaina"]
    word=word1+word2+word3+word4
    e=rd.choice(word)
    hint = ""
    if e in word1:
        hint="question word is a animal "
    elif e in word2:
        hint="question word is a fruit "
    elif e in word3:
        hint="question word is a bird "
    elif e in word4:
        hint="question word is a country name "
    object1 = list(e)
    object2 = []
    b = '_'
    for i in object1:
        object2.append(b)
    print("let`s play hangman game")
    print("you have only 6 lives , so try to guess the word in 6 attempts! . good luck!!")
    print("your hint is:", f"{hint}")
    print(object2)
    count = 0
    num = 0
    m=0
    for n in range(100):
        name = input("guess a letter:")
        for k in range(len(object1)):
            if name == object1[k]:
                object2[k] = name
        else:
            if name not in object2:
                count += 1
                print(f"you guessed {name} which is not present in the word.so,you loose a life")
                print(f"your remaining lives are {6 - count}")
            if name in object2:
                print(f"you guessed {name} which is  present in the word.")
        print(object2)
        if count == 0:
            print(" *----*")
            print(" |    |")
            print("      |")
            print("      |")
            print("      |")
            print("      |")
            print("=======")
        elif count == 1:
            print(" *----*")
            print(" |    |")
            print(" o    |")
            print("      |")
            print("      |")
            print("      |")
            print("=======")
        elif count == 2:
            print(" *----*")
            print(" |    |")
            print(" o    |")
            print(" |    |")
            print("      |")
            print("      |")
            print("=======")
        elif count == 3:
            print(" *----*")
            print(" |    |")
            print(" o    |")
            print("/|    |")
            print("      |")
            print("      |")
            print("=======")
        elif count == 4:
            print(" *----*")
            print(" |    |")
            print(" o    |")
            print("/|\\  |")
            print("      |")
            print("      |")
            print("=======")
        elif count == 5:
            print(" *----*")
            print(" |    |")
            print(" o    |")
            print("/|\\  |")
            print("/     |")
            print("      |")
            print("=======")
        elif count == 6:
            print(" *----*")
            print(" |    |")
            print(" o    |")
            print("/|\\  |")
            print("/ \\  |")
            print("      |")
            print("=======")
            print()
            print("you loose")
            print(f"answer {e} raa {e}")
            break
        for v in object2:
            if v != '_':
                pass
            else:
                break
        else:
            print("you win")
            print()
            d = input("do you want to restart your game(yes/no): ")
            if d == "yes":
                m=1
                break
            else:
                m=0
                break
    if m==1:
        pass
    elif count == 6 :
        print()
        d = input("do you want to restart your game(yes/no): ")
        if d == "yes":
            pass
        else:break
    else:pass



