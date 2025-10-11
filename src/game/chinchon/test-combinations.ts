// ============================================================================
// CHINCHÓN COMBINATIONS TESTER
// Herramienta simple para probar combinaciones de cartas en Chinchón
// ============================================================================

import { findCombinations } from './logic/gameLogic';
import { Card, Suit } from './types';
import { CHINCHON_VALUES } from './constants';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Crea una carta para testing
 */
function createCard(suit: Suit, value: number, id?: string): Card {
    return {
        id: id || `card_${suit}_${value}_${Math.random().toString(36).substr(2, 9)}`,
        suit,
        value,
        displayValue: value.toString(),
        chinchonValue: CHINCHON_VALUES[value] || 0,
    };
}

/**
 * Crea múltiples cartas del mismo palo
 */
function createCardsOfSuit(suit: Suit, values: number[]): Card[] {
    return values.map(value => createCard(suit, value));
}

/**
 * Crea múltiples cartas del mismo valor
 */
function createCardsOfValue(value: number, suits: Suit[]): Card[] {
    return suits.map(suit => createCard(suit, value));
}

/**
 * Imprime las combinaciones de forma legible
 */
function printCombinations(combinations: any[], testName: string): void {
    console.log(`\n🧪 ${testName}:`);
    console.log('='.repeat(50));
    
    if (combinations.length === 0) {
        console.log('   ❌ No se encontraron combinaciones');
        return;
    }
    
    combinations.forEach((combo, index) => {
        const cardsStr = combo.cards.map((c: Card) => `${c.displayValue}${c.suit.charAt(0).toUpperCase()}`).join(' ');
        console.log(`   ${index + 1}. ${combo.type.toUpperCase()}: [${cardsStr}] (${combo.points} puntos)`);
    });
    
    const totalPoints = combinations.reduce((sum, combo) => sum + combo.points, 0);
    console.log(`   📊 Total de puntos: ${totalPoints}`);
}

/**
 * Imprime las cartas de forma legible
 */
function printCards(cards: Card[], title: string = 'Cartas'): void {
    console.log(`\n🃏 ${title}:`);
    console.log('-'.repeat(30));
    cards.forEach((card, index) => {
        console.log(`   ${index + 1}. ${card.displayValue} de ${card.suit} (${card.chinchonValue} puntos)`);
    });
}

// ============================================================================
// FUNCIONES DE TESTING
// ============================================================================

/**
 * Función principal para probar combinaciones con cartas personalizadas
 */
export function testCombinations(cards: Card[], testName: string = 'Test Personalizado'): void {
    console.log(`\n🎮 ${testName}`);
    console.log('='.repeat(60));
    
    printCards(cards);
    const combinations = findCombinations(cards);
    printCombinations(combinations, 'Resultado');
}

/**
 * Función para probar combinaciones rápidas con arrays de números
 */
export function quickTest(suit: Suit, values: number[], testName?: string): void {
    const cards = createCardsOfSuit(suit, values);
    testCombinations(cards, testName || `Secuencia ${suit}: ${values.join(', ')}`);
}

/**
 * Función para probar grupos rápidos
 */
export function quickGroupTest(value: number, suits: Suit[], testName?: string): void {
    const cards = createCardsOfValue(value, suits);
    testCombinations(cards, testName || `Grupo de ${value}s`);
}

// ============================================================================
// EJEMPLOS PREDEFINIDOS
// ============================================================================

/**
 * Ejecuta todos los ejemplos predefinidos
 */
export function runExamples(): void {
    console.log('🎯 EJEMPLOS DE COMBINACIONES DE CHINCHÓN');
    console.log('='.repeat(60));

    // Ejemplo 1: Secuencia simple
    quickTest(Suit.OROS, [1, 2, 3], 'Secuencia simple (1-2-3)');

    // Ejemplo 2: Secuencia larga
    quickTest(Suit.COPAS, [1, 2, 3, 4, 5], 'Secuencia larga (1-2-3-4-5)');

    // Ejemplo 3: CHINCHÓN (7 cartas consecutivas)
    quickTest(Suit.ESPADAS, [1, 2, 3, 4, 5, 6, 7], 'CHINCHÓN (1-2-3-4-5-6-7)');

    // Ejemplo 4: Grupo simple
    quickGroupTest(5, [Suit.OROS, Suit.COPAS, Suit.ESPADAS], 'Grupo de 5s');

    // Ejemplo 5: Grupo de figuras
    quickGroupTest(10, [Suit.OROS, Suit.COPAS, Suit.ESPADAS, Suit.BASTOS], 'Grupo de figuras (10s)');

    // Ejemplo 6: Combinaciones mixtas
    const mixedCards = [
        ...createCardsOfSuit(Suit.OROS, [1, 2, 3]), // Secuencia
        ...createCardsOfValue(5, [Suit.COPAS, Suit.ESPADAS, Suit.BASTOS]), // Grupo
    ];
    testCombinations(mixedCards, 'Combinaciones mixtas');

    // Ejemplo 7: Sin combinaciones
    const noCombinations = [
        createCard(Suit.OROS, 1),
        createCard(Suit.COPAS, 3),
        createCard(Suit.ESPADAS, 5),
    ];
    testCombinations(noCombinations, 'Sin combinaciones válidas');

    // Ejemplo 8: Casi Chinchón
    const almostChinchon = [
        ...createCardsOfSuit(Suit.OROS, [1, 2, 3, 4, 5, 6]),
        createCard(Suit.COPAS, 7), // Esta rompe la secuencia
    ];
    testCombinations(almostChinchon, 'Casi Chinchón (6 cartas consecutivas)');

    console.log('\n✅ Ejemplos completados!');
}

// ============================================================================
// FUNCIONES DE UTILIDAD AVANZADA
// ============================================================================

/**
 * Crea una mano completa de 7 cartas para testing
 */
export function createHand(cardConfigs: Array<{suit: Suit, value: number}>): Card[] {
    return cardConfigs.map((config, index) => 
        createCard(config.suit, config.value, `hand_${index}`)
    );
}

/**
 * Prueba una mano específica con configuración detallada
 */
export function testHand(cardConfigs: Array<{suit: Suit, value: number}>, testName: string): void {
    const cards = createHand(cardConfigs);
    testCombinations(cards, testName);
}

/**
 * Compara dos conjuntos de cartas
 */
export function compareHands(hand1: Card[], hand2: Card[], name1: string, name2: string): void {
    console.log(`\n🆚 COMPARACIÓN: ${name1} vs ${name2}`);
    console.log('='.repeat(60));
    
    console.log('\n📋 Mano 1:');
    const combinations1 = findCombinations(hand1);
    printCards(hand1, name1);
    printCombinations(combinations1, 'Combinaciones');
    
    console.log('\n📋 Mano 2:');
    const combinations2 = findCombinations(hand2);
    printCards(hand2, name2);
    printCombinations(combinations2, 'Combinaciones');
    
    const points1 = combinations1.reduce((sum, combo) => sum + combo.points, 0);
    const points2 = combinations2.reduce((sum, combo) => sum + combo.points, 0);
    
    console.log(`\n🏆 Resultado:`);
    console.log(`   ${name1}: ${points1} puntos`);
    console.log(`   ${name2}: ${points2} puntos`);
    console.log(`   Ganador: ${points1 > points2 ? name1 : points2 > points1 ? name2 : 'Empate'}`);
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

/**
 * Función principal que se ejecuta cuando corres el archivo
 */
function main(): void {
    console.log('🎮 CHINCHÓN COMBINATIONS TESTER');
    console.log('================================');
    console.log('Este archivo te permite probar combinaciones de cartas en Chinchón');
    console.log('Modifica las funciones abajo para probar tus propias combinaciones\n');

    // ========================================
    // AQUÍ PUEDES AGREGAR TUS PROPIAS PRUEBAS
    // ========================================

    // Ejemplo: Prueba una secuencia personalizada
    quickTest(Suit.OROS, [2, 3, 4, 5], 'Mi secuencia personalizada');

    // Ejemplo: Prueba un grupo personalizado
    quickGroupTest(7, [Suit.OROS, Suit.COPAS, Suit.ESPADAS], 'Mi grupo de 7s');

    // Ejemplo: Prueba una mano completa personalizada
    testHand([
        { suit: Suit.OROS, value: 1 },
        { suit: Suit.OROS, value: 2 },
        { suit: Suit.OROS, value: 3 },
        { suit: Suit.COPAS, value: 5 },
        { suit: Suit.ESPADAS, value: 5 },
        { suit: Suit.BASTOS, value: 5 },
        { suit: Suit.OROS, value: 10 },
    ], 'Mi mano personalizada');

    // Ejemplo: Compara dos manos
    const hand1 = createHand([
        { suit: Suit.OROS, value: 1 },
        { suit: Suit.OROS, value: 2 },
        { suit: Suit.OROS, value: 3 },
        { suit: Suit.OROS, value: 4 },
        { suit: Suit.OROS, value: 5 },
        { suit: Suit.OROS, value: 6 },
        { suit: Suit.OROS, value: 7 },
    ]);
    
    const hand2 = createHand([
        { suit: Suit.OROS, value: 10 },
        { suit: Suit.COPAS, value: 10 },
        { suit: Suit.ESPADAS, value: 10 },
        { suit: Suit.BASTOS, value: 10 },
        { suit: Suit.OROS, value: 1 },
        { suit: Suit.COPAS, value: 1 },
        { suit: Suit.ESPADAS, value: 1 },
    ]);
    
    compareHands(hand1, hand2, 'Chinchón (7 cartas consecutivas)', 'Grupos de figuras');

    // Descomenta la línea siguiente para ejecutar todos los ejemplos
    // runExamples();
}

// ============================================================================
// INSTRUCCIONES DE USO
// ============================================================================

console.log(`
🎯 INSTRUCCIONES DE USO:

1. Para probar combinaciones simples:
   quickTest(Suit.OROS, [1, 2, 3], 'Mi prueba');

2. Para probar grupos:
   quickGroupTest(5, [Suit.OROS, Suit.COPAS, Suit.ESPADAS], 'Grupo de 5s');

3. Para probar manos completas:
   testHand([
     { suit: Suit.OROS, value: 1 },
     { suit: Suit.OROS, value: 2 },
     { suit: Suit.OROS, value: 3 },
     // ... más cartas
   ], 'Mi mano');

4. Para comparar dos manos:
   compareHands(mano1, mano2, 'Nombre 1', 'Nombre 2');

5. Para ejecutar todos los ejemplos:
   runExamples();

6. Para ejecutar este archivo:
   npx ts-node src/game/chinchon/test-combinations.ts
`);

// Ejecutar la función principal
if (require.main === module) {
    main();
}
