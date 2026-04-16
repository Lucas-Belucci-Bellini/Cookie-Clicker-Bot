// Aumente o "10" para a quantidade, e o "5" para o intervalo em segundos
function spawnManyGCS(amount, interval) {
    let spawned = 0;
    let timer = setInterval(function() {
        if (spawned < amount) {
            new Game.shimmer("golden");
            spawned++;
            console.log("Cookies dourados spawnados: " + spawned);
        } else {
            clearInterval(timer);
        }
    }, interval * 1000);
}
// Exemplo: Spawnar 10 cookies com 5 segundos de intervalo
spawnManyGCS(25, 5);
