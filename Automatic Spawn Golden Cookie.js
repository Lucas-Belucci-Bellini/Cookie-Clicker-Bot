// 2 ciclos × 5 trigos = 10 colhidos
for (let ciclo = 0; ciclo < 2; ciclo++) {

    // IDA: Arar, regar e plantar (→ Leste)
    for (let x = 0; x < 5; x++) {
        till();
        water();
        plant('strawberry');
        if (x < 4) moveEast();
    }

    // Esperar crescer (20 ticks com água deve ser suficiente)
    for (let t = 0; t < 20; t++) {
        wait();
    }

    // VOLTA: Colher (← Oeste)
    for (let x = 0; x < 5; x++) {
        harvest();
        if (x < 4) moveWest();
    }
}
