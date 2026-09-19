object1="groot"
hint=""
object1=list(object1)
object2=[]
b='_'
for i in object1:
    object2.append(b)
print("let`s play hangman game")
print("you have only 6 lives , so try to guess the word in 6 attempts! . good luck!!")
print("yo ur hint is" , hint)
print(object2)
count=0
num=0
for n in range(100):
    name = input("guess a letter:")
    for k in range(len(object1)):
        if name==object1[k]:
            object2[k]=name
    else:
        if name not in object2:
            count+=1
            print(f"you guessed {name} which is not present in the word.so,you loose a life")
            print(f"your remaining lives are {6-count}")
        if name in object2:
            print(f"you guessed {name} which is  present in the word.")
    print(object2)
    for v in object2:
        if v != '_':
            pass
        else:
            break
    else:
        print("you win")
        break

    if count==0:
        print(" *----*")
        print(" |    |")
        print("      |")
        print("      |")
        print("      |")
        print("      |")
        print("=======")
    elif count==1:
        print(" *----*")
        print(" |    |")
        print(" o    |")
        print("      |")
        print("      |")
        print("      |")
        print("=======")
    elif count==2:
        print(" *----*")
        print(" |    |")
        print(" o    |")
        print(" |    |")
        print("      |")
        print("      |")
        print("=======")
    elif count==3:
        print(" *----*")
        print(" |    |")
        print(" o    |")
        print("/|    |")
        print("      |")
        print("      |")
        print("=======")
    elif count==4:
        print(" *----*")
        print(" |    |")
        print(" o    |")
        print("/|\\  |")
        print("      |")
        print("      |")
        print("=======")
    elif count==5:
        print(" *----*")
        print(" |    |")
        print(" o    |")
        print("/|\\  |")
        print("/     |")
        print("      |")
        print("=======")
    elif count==6:
        print(" *----*")
        print(" |    |")
        print(" o    |")
        print("/|\\  |")
        print("/ \\  |")
        print("      |")
        print("=======")
        print()
        print("you loose")
        print(f"answer {object1} raa {object1}")
        break