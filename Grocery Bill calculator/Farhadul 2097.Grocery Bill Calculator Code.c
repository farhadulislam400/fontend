#include <stdio.h>
#include <stdlib.h>

#define MAX_ITEMS 100

int main() {
    float prices[MAX_ITEMS];
    int item_count = 0;
    float price, total = 0.0;
    char end;

    printf("Enter item prices (enter 'e' to end):\n");

    while (1) {
        printf("Item %d price: ", item_count + 1);
        if (scanf("%f", &price) == 1) {
            if (price >= 0 && item_count < MAX_ITEMS) {
                prices[item_count] = price;
                total += price;
                item_count++;
            } else {
                printf("Invalid price or max items reached.\n");
            }
        } else {
            scanf(" %c", &end);
            if (end == 'e' || end == 'E') {
                break;
            }
        }
}
printf("\nGrocery Bill:\n");
for (int i = 0; i < item_count; i++) {
printf("Item %d: $%.2f\n", i + 1, prices[i]);
}
printf("Total: $%.2f\n", total);
return 0;
}
