// ============================================================================
// CHINCHÓN COMBINATIONS TESTER
// Herramienta simple para probar combinaciones de cartas en Chinchón
// ============================================================================

import { findCombinations } from '../logic/gameLogic';
import { Card, Suit } from '../types';
import { CHINCHON_VALUES } from '../constants';

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

export function getCombinations(cards: Card[]): any[] {
    return findCombinations(cards);
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
 * Calcula y muestra los puntos de cartas sueltas
 */
function calculateUnusedPoints(cards: Card[], combinations: any[]): number {
    const usedCardIds = new Set<string>();
    combinations.forEach(combo => {
        combo.cards.forEach((card: Card) => usedCardIds.add(card.id));
    });
    
    const unusedCards = cards.filter(card => !usedCardIds.has(card.id));
    const unusedPoints = unusedCards.reduce((sum, card) => sum + card.chinchonValue, 0);
    
    return unusedPoints;
}

/**
 * Imprime resultado detallado de un test
 */
function printDetailedTest(testName: string, cards: Card[], expectedCombos?: string[]): void {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 TEST: ${testName}`);
    console.log('='.repeat(70));
    
    // Mostrar cartas
    console.log('\n📋 CARTAS:');
    cards.forEach((card, idx) => {
        console.log(`   ${idx + 1}. ${card.displayValue} de ${card.suit} (${card.chinchonValue} pts)`);
    });
    
    // Obtener combinaciones
    const combinations = findCombinations(cards);
    
    // Mostrar combinaciones encontradas
    console.log('\n✅ COMBINACIONES ENCONTRADAS:');
    if (combinations.length === 0) {
        console.log('   ❌ Ninguna');
    } else {
        combinations.forEach((combo, idx) => {
            const cardsStr = combo.cards
                .map((c: Card) => `${c.displayValue}${c.suit.charAt(0).toUpperCase()}`)
                .join('-');
            console.log(`   ${idx + 1}. ${combo.type === 'sequence' ? '🔢 ESCALERA' : '👥 GRUPO'}: [${cardsStr}] (${combo.points} pts)`);
        });
    }
    
    // Calcular y mostrar cartas sueltas
    const unusedPoints = calculateUnusedPoints(cards, combinations);
    const usedCardIds = new Set<string>();
    combinations.forEach(combo => {
        combo.cards.forEach((card: Card) => usedCardIds.add(card.id));
    });
    const unusedCards = cards.filter(card => !usedCardIds.has(card.id));
    
    console.log('\n💔 CARTAS SUELTAS:');
    if (unusedCards.length === 0) {
        console.log('   ✨ Ninguna (¡Todas las cartas están combinadas!)');
    } else {
        unusedCards.forEach((card, idx) => {
            console.log(`   ${idx + 1}. ${card.displayValue} de ${card.suit} (${card.chinchonValue} pts)`);
        });
    }
    console.log(`\n📊 PUNTOS TOTALES SUELTOS: ${unusedPoints}`);
    
    // Mostrar esperado si existe
    if (expectedCombos && expectedCombos.length > 0) {
        console.log('\n🎯 ESPERADO:');
        expectedCombos.forEach((desc, idx) => {
            console.log(`   ${idx + 1}. ${desc}`);
        });
    }
}

/**
 * Tests "tricky" que prueban el algoritmo inteligente
 */
function runTrickyTests(): void {
    console.log('\n\n');
    console.log('🎯'.repeat(35));
    console.log('🔥 TESTS TRICKY - VALIDACIÓN DE ALGORITMO INTELIGENTE 🔥');
    console.log('🎯'.repeat(35));
    
    // ========================================================================
    // TEST 1: Caso original del usuario (escalera de 4 + grupo de 3)
    // ========================================================================
    printDetailedTest(
        'Caso Original: Escalera 6-7-8-9 de Bastos + Grupo de 9s',
        [
            createCard(Suit.BASTOS, 6),
            createCard(Suit.BASTOS, 7),
            createCard(Suit.BASTOS, 8),
            createCard(Suit.BASTOS, 9),
            createCard(Suit.OROS, 9),
            createCard(Suit.COPAS, 9),
            createCard(Suit.ESPADAS, 9),
            createCard(Suit.ESPADAS, 2),
        ],
        [
            'Escalera: 6-7-8-9 de Bastos',
            'Grupo: 9 de Oros, 9 de Copas, 9 de Espadas',
            'Suelta: 2 de Espadas (2 puntos)'
        ]
    );
    
    // ========================================================================
    // TEST 2: Carta que puede ir en escalera O grupo - debe elegir mejor opción
    // ========================================================================
    printDetailedTest(
        'Decisión Inteligente: 5 puede ir en escalera o grupo',
        [
            createCard(Suit.OROS, 4),
            createCard(Suit.OROS, 5),
            createCard(Suit.OROS, 6),
            createCard(Suit.COPAS, 5),
            createCard(Suit.ESPADAS, 5),
            createCard(Suit.BASTOS, 10), // Figura suelta (10 pts)
            createCard(Suit.COPAS, 1),   // Carta suelta (1 pt)
        ],
        [
            'Debe elegir: Escalera 4-5-6 de Oros + 2 cartas sueltas (11 pts)',
            'En vez de: Grupo de 5s + carta 4 y 6 sueltas (15 pts)'
        ]
    );
    
    // ========================================================================
    // TEST 3: Múltiples escaleras posibles solapadas
    // ========================================================================
    printDetailedTest(
        'Escaleras Solapadas: 1-2-3-4-5 puede ser [1-2-3] + [3-4-5] o [1-2-3-4-5]',
        [
            createCard(Suit.COPAS, 1),
            createCard(Suit.COPAS, 2),
            createCard(Suit.COPAS, 3),
            createCard(Suit.COPAS, 4),
            createCard(Suit.COPAS, 5),
            createCard(Suit.ESPADAS, 10), // Figura suelta
            createCard(Suit.BASTOS, 11),  // Figura suelta
        ],
        [
            'Debe elegir: Una escalera larga 1-2-3-4-5 de Copas',
            'Cartas sueltas: 10 y 11 (20 pts)'
        ]
    );
    
    // ========================================================================
    // TEST 4: Grupo de 4 cartas
    // ========================================================================
    printDetailedTest(
        'Grupo Completo: 4 cartas del mismo valor',
        [
            createCard(Suit.OROS, 7),
            createCard(Suit.COPAS, 7),
            createCard(Suit.ESPADAS, 7),
            createCard(Suit.BASTOS, 7),
            createCard(Suit.OROS, 1),
            createCard(Suit.COPAS, 2),
            createCard(Suit.ESPADAS, 3),
        ],
        [
            'Grupo de 4: Todos los 7s',
            'Cartas sueltas: 1, 2, 3 (6 pts)'
        ]
    );
    
    // ========================================================================
    // TEST 5: Chinchón perfecto (7 cartas consecutivas)
    // ========================================================================
    printDetailedTest(
        'CHINCHÓN PERFECTO: 7 cartas consecutivas del mismo palo',
        [
            createCard(Suit.ESPADAS, 1),
            createCard(Suit.ESPADAS, 2),
            createCard(Suit.ESPADAS, 3),
            createCard(Suit.ESPADAS, 4),
            createCard(Suit.ESPADAS, 5),
            createCard(Suit.ESPADAS, 6),
            createCard(Suit.ESPADAS, 7),
        ],
        [
            'Escalera de 7: 1-2-3-4-5-6-7 de Espadas',
            'Cartas sueltas: Ninguna (0 pts) ¡CHINCHÓN!'
        ]
    );
    
    // ========================================================================
    // TEST 6: Dos grupos de 3 vs una escalera y un grupo
    // ========================================================================
    printDetailedTest(
        'Elección Óptima: Priorizar combinaciones que minimicen puntos',
        [
            createCard(Suit.OROS, 5),
            createCard(Suit.COPAS, 5),
            createCard(Suit.ESPADAS, 5),
            createCard(Suit.BASTOS, 3),
            createCard(Suit.OROS, 3),
            createCard(Suit.COPAS, 3),
            createCard(Suit.ESPADAS, 10), // Figura suelta (10 pts)
        ],
        [
            'Grupo de 5s + Grupo de 3s',
            'Carta suelta: 10 de Espadas (10 pts)'
        ]
    );
    
    // ========================================================================
    // TEST 7: Caso complejo - múltiples opciones
    // ========================================================================
    printDetailedTest(
        'CASO COMPLEJO: Debe analizar todas las combinaciones posibles',
        [
            createCard(Suit.OROS, 1),
            createCard(Suit.OROS, 2),
            createCard(Suit.OROS, 3),
            createCard(Suit.COPAS, 2),
            createCard(Suit.ESPADAS, 2),
            createCard(Suit.BASTOS, 2),
            createCard(Suit.COPAS, 10),  // Figura (10 pts)
            createCard(Suit.ESPADAS, 11), // Figura (10 pts)
        ],
        [
            'Opción A: Escalera 1-2-3 de Oros + Grupo de 2s (¿imposible por el 2 de Oros?)',
            'Debe elegir la opción que deje menos puntos sueltos'
        ]
    );
    
    // ========================================================================
    // TEST 8: Tres cartas consecutivas repetidas (6,6,7,7,8,8)
    // ========================================================================
    printDetailedTest(
        'Cartas Duplicadas: Múltiples formas de hacer escaleras',
        [
            createCard(Suit.OROS, 6, 'oros_6_1'),
            createCard(Suit.OROS, 7, 'oros_7_1'),
            createCard(Suit.OROS, 8, 'oros_8_1'),
            createCard(Suit.COPAS, 6, 'copas_6_1'),
            createCard(Suit.COPAS, 7, 'copas_7_1'),
            createCard(Suit.COPAS, 8, 'copas_8_1'),
            createCard(Suit.ESPADAS, 1), // Suelta
        ],
        [
            'Dos escaleras: 6-7-8 de Oros y 6-7-8 de Copas',
            'Carta suelta: 1 de Espadas (1 pt)'
        ]
    );
    
    // ========================================================================
    // TEST 9: Sin combinaciones posibles
    // ========================================================================
    printDetailedTest(
        'Sin Combinaciones: Todas cartas sueltas',
        [
            createCard(Suit.OROS, 1),
            createCard(Suit.COPAS, 3),
            createCard(Suit.ESPADAS, 5),
            createCard(Suit.BASTOS, 7),
            createCard(Suit.OROS, 10),
            createCard(Suit.COPAS, 11),
            createCard(Suit.ESPADAS, 12),
        ],
        [
            'Ninguna combinación posible',
            'Todas las cartas quedan sueltas'
        ]
    );
    
    // ========================================================================
    // TEST 10: Corte perfecto (3+3 con carta <5)
    // ========================================================================
    printDetailedTest(
        'Corte Perfecto: 3+3 cartas combinadas + 1 carta menor a 5',
        [
            createCard(Suit.OROS, 5),
            createCard(Suit.COPAS, 5),
            createCard(Suit.ESPADAS, 5),
            createCard(Suit.BASTOS, 7),
            createCard(Suit.OROS, 7),
            createCard(Suit.COPAS, 7),
            createCard(Suit.ESPADAS, 2), // Carta para cortar (2 pts)
        ],
        [
            'Grupo de 5s + Grupo de 7s',
            'Carta para cortar: 2 de Espadas (2 pts)'
        ]
    );

    // ========================================================================
    // TEST 11: Escalera larga con carta extra que forma grupo
    // ========================================================================
    printDetailedTest(
        'Optimización Compleja: Escalera vs incluir carta en grupo',
        [
            createCard(Suit.OROS, 2),
            createCard(Suit.OROS, 3),
            createCard(Suit.OROS, 4),
            createCard(Suit.OROS, 5),
            createCard(Suit.COPAS, 5),
            createCard(Suit.ESPADAS, 5),
            createCard(Suit.BASTOS, 11), // Figura suelta (10 pts)
        ],
        [
            'Opción A: Escalera 2-3-4-5 de Oros + Figura suelta (10 pts)',
            'Opción B: Escalera 2-3-4 de Oros + Grupo de 5s + 0 cartas sueltas (MEJOR)',
            'Debe elegir la opción B'
        ]
    );

    console.log('\n\n');
    console.log('='.repeat(70));
    console.log('✅ TESTS COMPLETADOS - Revisa los resultados arriba');
    console.log('='.repeat(70));
    console.log('\n');
}

/**
 * Función principal que se ejecuta cuando corres el archivo
 */
function main(): void {
    // Ejecutar todos los tests tricky
    runTrickyTests();
}

// Ejecutar la función principal
if (require.main === module) {
    main();
}
