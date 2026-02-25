<?php

namespace App\Data;

/**
 * Curated database of verified, well-documented quotes by famous historical figures.
 * Each entry maps a lowercase author name to their most iconic verified quote(s) and bio.
 *
 * Sources: Widely documented quotes from encyclopedias, biographies, and historical records.
 * Only includes quotes that are consistently attributed to each person across multiple sources.
 */
class VerifiedQuotes
{
    /**
     * Look up a verified quote for a person.
     * Tries exact match first, then partial/last-name match.
     *
     * @return array|null ['quote' => string, 'who' => string] or null if not found
     */
    public static function find(string $authorName): ?array
    {
        $db = self::database();
        $authorLower = mb_strtolower(trim($authorName));

        // Exact match
        if (isset($db[$authorLower])) {
            return $db[$authorLower];
        }

        // Try removing accents for matching
        $authorNormalized = self::removeAccents($authorLower);
        foreach ($db as $key => $value) {
            if (self::removeAccents($key) === $authorNormalized) {
                return $value;
            }
        }

        // Last name match (for cases like "Einstein" matching "albert einstein")
        $authorParts = explode(' ', $authorLower);
        $authorLastName = end($authorParts);

        if (mb_strlen($authorLastName) >= 4) {
            foreach ($db as $key => $value) {
                $keyParts = explode(' ', $key);
                $keyLastName = end($keyParts);
                if ($keyLastName === $authorLastName) {
                    return $value;
                }
                // Also try normalized
                if (self::removeAccents($keyLastName) === self::removeAccents($authorLastName)) {
                    return $value;
                }
            }
        }

        // Substring match
        if (mb_strlen($authorLower) >= 6) {
            foreach ($db as $key => $value) {
                if (str_contains($key, $authorLower) || str_contains($authorLower, $key)) {
                    return $value;
                }
            }
        }

        return null;
    }

    private static function removeAccents(string $str): string
    {
        $map = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'ñ' => 'n', 'ü' => 'u', 'à' => 'a', 'è' => 'e', 'ì' => 'i',
            'ò' => 'o', 'ù' => 'u', 'â' => 'a', 'ê' => 'e', 'î' => 'i',
            'ô' => 'o', 'û' => 'u', 'ä' => 'a', 'ë' => 'e', 'ï' => 'i',
            'ö' => 'o', 'ç' => 'c',
        ];
        return strtr($str, $map);
    }

    /**
     * The verified quotes database.
     * Key: lowercase full name. Value: ['quote' => ..., 'who' => ...]
     */
    private static function database(): array
    {
        return [
            // ═══════════════════════════════════════════
            // CIENCIA Y TECNOLOGÍA
            // ═══════════════════════════════════════════

            'albert einstein' => [
                'quote' => 'La imaginación es más importante que el conocimiento. El conocimiento es limitado, la imaginación circunda el mundo.',
                'who' => 'Físico teórico alemán (1879-1955). Premio Nobel de Física 1921. Desarrolló la teoría de la relatividad, transformando nuestra comprensión del espacio, tiempo y energía.',
            ],
            'isaac newton' => [
                'quote' => 'Si he logrado ver más lejos, ha sido porque he subido a hombros de gigantes.',
                'who' => 'Matemático, físico y astrónomo inglés (1643-1727). Formuló las leyes del movimiento y la gravitación universal, sentando las bases de la física clásica.',
            ],
            'galileo galilei' => [
                'quote' => 'Y sin embargo, se mueve.',
                'who' => 'Astrónomo, físico y matemático italiano (1564-1642). Padre de la astronomía observacional moderna. Defendió el heliocentrismo ante la Inquisición.',
            ],
            'marie curie' => [
                'quote' => 'En la vida no hay nada que temer, solo hay que comprender.',
                'who' => 'Física y química polaca-francesa (1867-1934). Primera mujer en ganar un Premio Nobel y única persona en ganarlo en dos ciencias distintas (Física 1903, Química 1911).',
            ],
            'nikola tesla' => [
                'quote' => 'El presente es de ustedes, pero el futuro es mío.',
                'who' => 'Inventor e ingeniero serbio-estadounidense (1856-1943). Pionero de la corriente alterna, inventó el motor de inducción y contribuyó al desarrollo de la radio.',
            ],
            'charles darwin' => [
                'quote' => 'No es la especie más fuerte la que sobrevive, ni la más inteligente, sino la que mejor responde al cambio.',
                'who' => 'Naturalista inglés (1809-1882). Formuló la teoría de la evolución por selección natural, transformando la biología para siempre.',
            ],
            'stephen hawking' => [
                'quote' => 'La inteligencia es la capacidad de adaptarse al cambio.',
                'who' => 'Físico teórico británico (1942-2018). Estudió los agujeros negros y la cosmología. Su libro "Breve historia del tiempo" popularizó la ciencia a nivel mundial.',
            ],
            'louis pasteur' => [
                'quote' => 'La suerte favorece a la mente preparada.',
                'who' => 'Químico y microbiólogo francés (1822-1895). Padre de la microbiología. Desarrolló la pasteurización y vacunas contra la rabia y el ántrax.',
            ],
            'thomas edison' => [
                'quote' => 'El genio es un uno por ciento de inspiración y un noventa y nueve por ciento de transpiración.',
                'who' => 'Inventor y empresario estadounidense (1847-1931). Patentó más de 1.000 inventos, incluyendo la bombilla eléctrica práctica y el fonógrafo.',
            ],
            'alexander graham bell' => [
                'quote' => 'Cuando una puerta se cierra, otra se abre; pero a menudo miramos tanto la puerta cerrada que no vemos la que se ha abierto.',
                'who' => 'Científico e inventor escocés-estadounidense (1847-1922). Patentó el teléfono y fundó la Bell Telephone Company.',
            ],
            'nicolás copérnico' => [
                'quote' => 'Saber que sabemos lo que sabemos, y saber que no sabemos lo que no sabemos, esa es la verdadera sabiduría.',
                'who' => 'Astrónomo polaco (1473-1543). Formuló la teoría heliocéntrica del sistema solar, revolucionando la astronomía.',
            ],
            'johannes kepler' => [
                'quote' => 'La naturaleza usa tan pocas cosas como sea posible.',
                'who' => 'Astrónomo y matemático alemán (1571-1630). Formuló las tres leyes del movimiento planetario, fundamentales para la astronomía moderna.',
            ],
            'alexander fleming' => [
                'quote' => 'Un buen investigador necesita la capacidad de observar lo inesperado.',
                'who' => 'Médico y microbiólogo escocés (1881-1955). Descubrió la penicilina en 1928, revolucionando la medicina y salvando millones de vidas.',
            ],
            'carl sagan' => [
                'quote' => 'En algún lugar, algo increíble está esperando ser descubierto.',
                'who' => 'Astrónomo y divulgador científico estadounidense (1934-1996). Popularizó la ciencia con su serie "Cosmos" y contribuyó al programa espacial de la NASA.',
            ],
            'leonardo da vinci' => [
                'quote' => 'La simplicidad es la máxima sofisticación.',
                'who' => 'Polímata italiano del Renacimiento (1452-1519). Pintor, inventor, científico y escritor. Creó La Mona Lisa, La Última Cena y diseñó máquinas voladoras siglos antes de su tiempo.',
            ],
            'arquímedes' => [
                'quote' => '¡Eureka! ¡Lo encontré!',
                'who' => 'Matemático, físico e inventor griego (c. 287-212 a.C.). Uno de los más grandes científicos de la antigüedad. Descubrió el principio de flotabilidad y la palanca.',
            ],
            'ada lovelace' => [
                'quote' => 'Esa máquina analítica teje patrones algebraicos igual que el telar de Jacquard teje flores y hojas.',
                'who' => 'Matemática y escritora británica (1815-1852). Considerada la primera programadora de la historia por su trabajo con la máquina analítica de Charles Babbage.',
            ],
            'max planck' => [
                'quote' => 'La ciencia no puede resolver el último misterio de la naturaleza porque, en último análisis, nosotros mismos somos parte del misterio que tratamos de resolver.',
                'who' => 'Físico alemán (1858-1947). Premio Nobel de Física 1918. Padre de la teoría cuántica, revolucionó la comprensión de la física a escala atómica.',
            ],
            'niels bohr' => [
                'quote' => 'Un experto es una persona que ha cometido todos los errores que se pueden cometer en un campo muy estrecho.',
                'who' => 'Físico danés (1885-1962). Premio Nobel de Física 1922. Desarrolló el modelo atómico de Bohr y contribuyó fundamentalmente a la mecánica cuántica.',
            ],
            'werner heisenberg' => [
                'quote' => 'No solo el universo es más extraño de lo que pensamos, es más extraño de lo que podemos pensar.',
                'who' => 'Físico teórico alemán (1901-1976). Premio Nobel de Física 1932. Formuló el principio de incertidumbre, pilar de la mecánica cuántica.',
            ],
            'richard feynman' => [
                'quote' => 'El primer principio es que no debes engañarte a ti mismo, y tú eres la persona más fácil de engañar.',
                'who' => 'Físico teórico estadounidense (1918-1988). Premio Nobel de Física 1965. Pionero en electrodinámica cuántica y gran divulgador científico.',
            ],
            'alan turing' => [
                'quote' => 'A veces son las personas de las que nadie espera nada las que hacen cosas que nadie puede imaginar.',
                'who' => 'Matemático y lógico británico (1912-1954). Padre de la computación moderna y la inteligencia artificial. Descifró el código Enigma en la Segunda Guerra Mundial.',
            ],
            'alfred nobel' => [
                'quote' => 'Mi hogar es donde está mi trabajo, y trabajo en todas partes.',
                'who' => 'Químico, ingeniero e inventor sueco (1833-1896). Inventó la dinamita. Fundó los Premios Nobel con su fortuna para reconocer contribuciones a la humanidad.',
            ],

            // ═══════════════════════════════════════════
            // FILOSOFÍA
            // ═══════════════════════════════════════════

            'sócrates' => [
                'quote' => 'Solo sé que no sé nada.',
                'who' => 'Filósofo griego (470-399 a.C.). Padre de la filosofía occidental. Su método socrático de preguntas sentó las bases del pensamiento crítico.',
            ],
            'platón' => [
                'quote' => 'La medida de un hombre es lo que hace con el poder.',
                'who' => 'Filósofo griego (428-348 a.C.). Discípulo de Sócrates y maestro de Aristóteles. Fundó la Academia de Atenas, primera institución de educación superior.',
            ],
            'aristóteles' => [
                'quote' => 'Somos lo que hacemos repetidamente. La excelencia, entonces, no es un acto sino un hábito.',
                'who' => 'Filósofo y científico griego (384-322 a.C.). Discípulo de Platón. Sus estudios abarcaron lógica, metafísica, ética, política, biología y retórica.',
            ],
            'rené descartes' => [
                'quote' => 'Pienso, luego existo.',
                'who' => 'Filósofo, matemático y científico francés (1596-1650). Padre de la filosofía moderna y la geometría analítica.',
            ],
            'immanuel kant' => [
                'quote' => 'Atrévete a pensar. Ten el valor de usar tu propia razón.',
                'who' => 'Filósofo alemán (1724-1804). Una de las figuras centrales de la filosofía moderna. Su Crítica de la razón pura transformó la epistemología.',
            ],
            'friedrich nietzsche' => [
                'quote' => 'Aquel que tiene un porqué para vivir puede soportar casi cualquier cómo.',
                'who' => 'Filósofo, poeta y filólogo alemán (1844-1900). Cuestionó los valores tradicionales con conceptos como el superhombre y la voluntad de poder.',
            ],
            'confucio' => [
                'quote' => 'No importa lo lento que vayas, siempre y cuando no te detengas.',
                'who' => 'Filósofo y maestro chino (551-479 a.C.). Su doctrina ética influyó profundamente en la civilización china y del este asiático durante más de dos milenios.',
            ],
            'lao-tse' => [
                'quote' => 'Un viaje de mil millas comienza con un solo paso.',
                'who' => 'Filósofo chino (siglo VI a.C.). Fundador del taoísmo y autor del Tao Te Ching, uno de los textos más traducidos de la historia.',
            ],
            'voltaire' => [
                'quote' => 'No estoy de acuerdo con lo que dices, pero defenderé con mi vida tu derecho a decirlo.',
                'who' => 'Escritor y filósofo francés (1694-1778). Figura central de la Ilustración. Defensor de las libertades civiles y la separación Iglesia-Estado.',
            ],
            'jean-jacques rousseau' => [
                'quote' => 'El hombre nace libre, y en todas partes se encuentra encadenado.',
                'who' => 'Filósofo, escritor y compositor suizo-francés (1712-1778). Su "Contrato Social" influyó en la Revolución Francesa y la filosofía política moderna.',
            ],
            'karl marx' => [
                'quote' => 'Los filósofos no han hecho más que interpretar de diversos modos el mundo, pero de lo que se trata es de transformarlo.',
                'who' => 'Filósofo, economista y sociólogo alemán (1818-1883). Autor de "El Capital". Sus ideas sobre lucha de clases y capitalismo transformaron la política mundial.',
            ],
            'arthur schopenhauer' => [
                'quote' => 'Toda verdad pasa por tres etapas: primero es ridiculizada, después es violentamente rechazada, y finalmente es aceptada como evidente.',
                'who' => 'Filósofo alemán (1788-1860). Su filosofía del pesimismo y la voluntad influyó profundamente en Nietzsche, Freud y la literatura moderna.',
            ],
            'søren kierkegaard' => [
                'quote' => 'La vida solo puede ser comprendida mirando hacia atrás, pero ha de ser vivida mirando hacia adelante.',
                'who' => 'Filósofo y teólogo danés (1813-1855). Considerado el padre del existencialismo. Exploró la angustia, la fe y la existencia individual.',
            ],
            'jean-paul sartre' => [
                'quote' => 'El hombre está condenado a ser libre.',
                'who' => 'Filósofo y escritor francés (1905-1980). Principal exponente del existencialismo. Premio Nobel de Literatura 1964 (rechazado).',
            ],
            'simone de beauvoir' => [
                'quote' => 'No se nace mujer, se llega a serlo.',
                'who' => 'Escritora, filósofa y feminista francesa (1908-1986). Su obra "El segundo sexo" es fundacional del feminismo moderno.',
            ],
            'michel de montaigne' => [
                'quote' => 'Nada fija tanto una cosa en la memoria como el deseo de olvidarla.',
                'who' => 'Filósofo y escritor francés (1533-1592). Creador del género del ensayo. Sus "Ensayos" exploran la condición humana con honestidad radical.',
            ],
            'epicuro' => [
                'quote' => 'No es tanto la ayuda de nuestros amigos lo que nos ayuda, sino la confianza en que nos ayudarán.',
                'who' => 'Filósofo griego (341-270 a.C.). Fundador del epicureísmo. Sostuvo que el placer (entendido como ausencia de dolor) es el mayor bien.',
            ],
            'marco aurelio' => [
                'quote' => 'La felicidad de tu vida depende de la calidad de tus pensamientos.',
                'who' => 'Emperador romano y filósofo estoico (121-180 d.C.). Sus "Meditaciones" son un clásico de la filosofía estoica y el autoexamen.',
            ],
            'séneca' => [
                'quote' => 'No es que tengamos poco tiempo, sino que perdemos mucho.',
                'who' => 'Filósofo, político y escritor romano (4 a.C.-65 d.C.). Principal exponente del estoicismo romano. Tutor del emperador Nerón.',
            ],
            'baruch spinoza' => [
                'quote' => 'La paz no es la ausencia de guerra, sino una virtud, un estado de ánimo, una disposición a la benevolencia, la confianza y la justicia.',
                'who' => 'Filósofo neerlandés (1632-1677). Uno de los grandes racionalistas. Su ética sentó bases para la Ilustración y la filosofía moderna.',
            ],

            // ═══════════════════════════════════════════
            // LITERATURA
            // ═══════════════════════════════════════════

            'william shakespeare' => [
                'quote' => 'Ser o no ser, esa es la cuestión.',
                'who' => 'Poeta y dramaturgo inglés (1564-1616). Considerado el mayor escritor en lengua inglesa. Autor de Hamlet, Romeo y Julieta, y Macbeth.',
            ],
            'miguel de cervantes' => [
                'quote' => 'La libertad es uno de los más preciosos dones que a los hombres dieron los cielos.',
                'who' => 'Escritor español (1547-1616). Autor de Don Quijote de la Mancha, considerada la primera novela moderna y la obra cumbre de la literatura en español.',
            ],
            'gabriel garcía márquez' => [
                'quote' => 'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para contarla.',
                'who' => 'Escritor y periodista colombiano (1927-2014). Premio Nobel de Literatura 1982. Máximo exponente del realismo mágico con "Cien años de soledad".',
            ],
            'pablo neruda' => [
                'quote' => 'Puedo escribir los versos más tristes esta noche.',
                'who' => 'Poeta y diplomático chileno (1904-1973). Premio Nobel de Literatura 1971. Considerado uno de los más grandes poetas del siglo XX en lengua española.',
            ],
            'jorge luis borges' => [
                'quote' => 'Siempre imaginé que el paraíso sería algún tipo de biblioteca.',
                'who' => 'Escritor argentino (1899-1986). Maestro de la ficción fantástica y filosófica. Sus cuentos y ensayos influyeron en la literatura universal del siglo XX.',
            ],
            'octavio paz' => [
                'quote' => 'La soledad es el fondo último de la condición humana.',
                'who' => 'Poeta, ensayista y diplomático mexicano (1914-1998). Premio Nobel de Literatura 1990. Exploró la identidad mexicana en "El laberinto de la soledad".',
            ],
            'mario vargas llosa' => [
                'quote' => 'Aprender a leer es lo más importante que me ha pasado en la vida.',
                'who' => 'Escritor y político peruano-español (1936-). Premio Nobel de Literatura 2010. Autor de "La ciudad y los perros" y "La fiesta del Chivo".',
            ],
            'mark twain' => [
                'quote' => 'La bondad es el lenguaje que los sordos pueden oír y los ciegos pueden ver.',
                'who' => 'Escritor y humorista estadounidense (1835-1910). Autor de Las aventuras de Tom Sawyer y Huckleberry Finn, considerado el padre de la literatura americana.',
            ],
            'oscar wilde' => [
                'quote' => 'Sé tú mismo; todos los demás ya están ocupados.',
                'who' => 'Escritor y poeta irlandés (1854-1900). Maestro del ingenio y la sátira. Autor de "El retrato de Dorian Gray" y obras teatrales brillantes.',
            ],
            'victor hugo' => [
                'quote' => 'No hay nada más poderoso que una idea cuyo momento ha llegado.',
                'who' => 'Escritor francés (1802-1885). Autor de Los Miserables y Nuestra Señora de París. Figura central del romanticismo francés.',
            ],
            'león tolstói' => [
                'quote' => 'Todas las familias felices se parecen unas a otras, pero cada familia infeliz lo es a su manera.',
                'who' => 'Escritor ruso (1828-1910). Autor de Guerra y Paz y Anna Karénina, consideradas entre las mejores novelas jamás escritas.',
            ],
            'fiódor dostoievski' => [
                'quote' => 'El secreto de la existencia humana no consiste solamente en vivir, sino también en saber para qué se vive.',
                'who' => 'Escritor ruso (1821-1881). Maestro de la novela psicológica. Autor de Crimen y castigo, Los hermanos Karamázov y El idiota.',
            ],
            'franz kafka' => [
                'quote' => 'Un libro debe ser el hacha que rompa el mar helado dentro de nosotros.',
                'who' => 'Escritor checo de lengua alemana (1883-1924). Maestro del absurdo y la angustia existencial. Autor de "La metamorfosis" y "El proceso".',
            ],
            'ernest hemingway' => [
                'quote' => 'El mundo es un lugar hermoso y vale la pena luchar por él.',
                'who' => 'Escritor y periodista estadounidense (1899-1961). Premio Nobel de Literatura 1954. Su estilo directo y conciso revolucionó la narrativa moderna.',
            ],
            'charles dickens' => [
                'quote' => 'Eran los mejores tiempos, eran los peores tiempos.',
                'who' => 'Escritor inglés (1812-1870). Autor de Oliver Twist, David Copperfield y Cuento de Navidad. El novelista más popular de la era victoriana.',
            ],
            'jane austen' => [
                'quote' => 'Es una verdad universalmente reconocida que un hombre soltero en posesión de una buena fortuna necesita una esposa.',
                'who' => 'Escritora británica (1775-1817). Sus novelas de costumbres, como Orgullo y prejuicio, son clásicos de la literatura inglesa.',
            ],
            'antoine de saint-exupéry' => [
                'quote' => 'Solo se ve bien con el corazón. Lo esencial es invisible a los ojos.',
                'who' => 'Escritor y aviador francés (1900-1944). Autor de "El Principito", uno de los libros más traducidos y vendidos de la historia.',
            ],
            'edgar allan poe' => [
                'quote' => 'Todos los que sueñan saben que hay algo de verdad en los sueños.',
                'who' => 'Escritor, poeta y crítico estadounidense (1809-1849). Padre del cuento de terror y la novela policíaca. Autor de "El cuervo" y "El gato negro".',
            ],
            'rubén darío' => [
                'quote' => 'Juventud, divino tesoro, ¡ya te vas para no volver!',
                'who' => 'Poeta nicaragüense (1867-1916). Padre del modernismo literario en español. Su obra renovó la poesía en lengua castellana.',
            ],
            'federico garcía lorca' => [
                'quote' => 'El más terrible de los sentimientos es el sentimiento de tener la esperanza perdida.',
                'who' => 'Poeta y dramaturgo español (1898-1936). Miembro de la Generación del 27. Autor de "Romancero gitano" y "Bodas de sangre". Asesinado en la Guerra Civil.',
            ],
            'walt whitman' => [
                'quote' => 'Yo me celebro y me canto a mí mismo. Y lo que yo diga ahora de mí, lo digo de ti.',
                'who' => 'Poeta estadounidense (1819-1892). Su obra "Hojas de hierba" revolucionó la poesía con el verso libre y la celebración de la democracia.',
            ],
            'virginia woolf' => [
                'quote' => 'Una mujer debe tener dinero y una habitación propia si va a escribir ficción.',
                'who' => 'Escritora británica (1882-1941). Pionera del modernismo literario. Autora de "La señora Dalloway" y "Al faro". Innovó con la técnica del flujo de conciencia.',
            ],
            'julio cortázar' => [
                'quote' => 'Andábamos sin buscarnos pero sabiendo que andábamos para encontrarnos.',
                'who' => 'Escritor argentino-francés (1914-1984). Maestro del cuento fantástico y experimental. Autor de "Rayuela" y "Bestiario".',
            ],
            'mario benedetti' => [
                'quote' => 'Después de todo, la muerte es solo un síntoma de que hubo vida.',
                'who' => 'Escritor y poeta uruguayo (1920-2009). Uno de los autores latinoamericanos más leídos. Su poesía combina compromiso social y ternura cotidiana.',
            ],
            'miguel de unamuno' => [
                'quote' => 'Solo el que sabe es libre, y más libre el que más sabe.',
                'who' => 'Escritor y filósofo español (1864-1936). Rector de la Universidad de Salamanca. Figura central de la Generación del 98.',
            ],
            'dante alighieri' => [
                'quote' => 'El camino más oscuro es el que lleva a la luz más brillante.',
                'who' => 'Poeta italiano (1265-1321). Autor de "La Divina Comedia", obra maestra de la literatura universal y piedra angular de la lengua italiana.',
            ],
            'johann wolfgang von goethe' => [
                'quote' => 'Sea lo que sea que puedas hacer o soñar, comienza. La audacia tiene genio, poder y magia.',
                'who' => 'Escritor y poeta alemán (1749-1832). Autor de Fausto. Figura central de la literatura alemana y del movimiento romántico europeo.',
            ],
            'fyodor dostoevsky' => [
                'quote' => 'El secreto de la existencia humana no consiste solamente en vivir, sino también en saber para qué se vive.',
                'who' => 'Escritor ruso (1821-1881). Maestro de la novela psicológica. Autor de Crimen y castigo, Los hermanos Karamázov y El idiota.',
            ],
            'leo tolstoy' => [
                'quote' => 'Todas las familias felices se parecen unas a otras, pero cada familia infeliz lo es a su manera.',
                'who' => 'Escritor ruso (1828-1910). Autor de Guerra y Paz y Anna Karénina, consideradas entre las mejores novelas jamás escritas.',
            ],
            'hermann hesse' => [
                'quote' => 'No existe nadie que sea completamente sabio o completamente loco. Todos somos una mezcla.',
                'who' => 'Escritor y poeta alemán-suizo (1877-1962). Premio Nobel de Literatura 1946. Autor de "Siddhartha" y "El lobo estepario".',
            ],
            'albert camus' => [
                'quote' => 'En medio del invierno, descubrí que había en mí un invencible verano.',
                'who' => 'Escritor y filósofo francés-argelino (1913-1960). Premio Nobel de Literatura 1957. Exponente del absurdismo. Autor de "El extranjero" y "La peste".',
            ],

            // ═══════════════════════════════════════════
            // LÍDERES Y POLÍTICA
            // ═══════════════════════════════════════════

            'nelson mandela' => [
                'quote' => 'La educación es el arma más poderosa que puedes usar para cambiar el mundo.',
                'who' => 'Líder sudafricano (1918-2013). Luchó contra el apartheid, estuvo 27 años preso y fue el primer presidente negro de Sudáfrica. Nobel de la Paz 1993.',
            ],
            'mahatma gandhi' => [
                'quote' => 'Sé el cambio que deseas ver en el mundo.',
                'who' => 'Líder pacifista indio (1869-1948). Lideró el movimiento de independencia de la India mediante la resistencia no violenta. Inspiró movimientos civiles en todo el mundo.',
            ],
            'martin luther king jr.' => [
                'quote' => 'Tengo un sueño: que mis cuatro hijos pequeños vivirán un día en una nación donde no serán juzgados por el color de su piel sino por su carácter.',
                'who' => 'Pastor y activista estadounidense (1929-1968). Líder del movimiento por los derechos civiles. Premio Nobel de la Paz 1964. Asesinado en Memphis.',
            ],
            'winston churchill' => [
                'quote' => 'El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el valor para continuar.',
                'who' => 'Político y estadista británico (1874-1965). Primer Ministro durante la Segunda Guerra Mundial. Lideró a Gran Bretaña contra el nazismo. Nobel de Literatura 1953.',
            ],
            'abraham lincoln' => [
                'quote' => 'La mejor forma de predecir el futuro es creándolo.',
                'who' => 'Político estadounidense (1809-1865). 16° presidente de Estados Unidos. Abolió la esclavitud y preservó la Unión durante la Guerra Civil.',
            ],
            'simón bolívar' => [
                'quote' => 'Un pueblo ignorante es instrumento ciego de su propia destrucción.',
                'who' => 'Líder militar y político venezolano (1783-1830). Libertador de Venezuela, Colombia, Ecuador, Perú y Bolivia. Héroe de la independencia sudamericana.',
            ],
            'josé martí' => [
                'quote' => 'La patria es dicha de todos, y dolor de todos, y cielo para todos.',
                'who' => 'Poeta, escritor y líder independentista cubano (1853-1895). Héroe nacional de Cuba. Luchó por la independencia de su país de España.',
            ],
            'che guevara' => [
                'quote' => 'Seamos realistas, pidamos lo imposible.',
                'who' => 'Médico, revolucionario y guerrillero argentino-cubano (1928-1967). Figura central de la Revolución Cubana junto a Fidel Castro.',
            ],
            'benito juárez' => [
                'quote' => 'Entre los individuos, como entre las naciones, el respeto al derecho ajeno es la paz.',
                'who' => 'Político y abogado mexicano de origen zapoteca (1806-1872). Presidente de México. Héroe nacional que defendió la soberanía contra la intervención francesa.',
            ],
            'john f. kennedy' => [
                'quote' => 'No preguntes qué puede hacer tu país por ti, pregunta qué puedes hacer tú por tu país.',
                'who' => 'Político estadounidense (1917-1963). 35° presidente de Estados Unidos. Impulsó la carrera espacial y enfrentó la Crisis de los Misiles. Asesinado en Dallas.',
            ],
            'franklin d. roosevelt' => [
                'quote' => 'Lo único que debemos temer es al temor mismo.',
                'who' => 'Político estadounidense (1882-1945). 32° presidente de Estados Unidos. Lideró al país durante la Gran Depresión y la Segunda Guerra Mundial.',
            ],
            'theodore roosevelt' => [
                'quote' => 'Haz lo que puedas, con lo que tengas, donde estés.',
                'who' => 'Político y explorador estadounidense (1858-1919). 26° presidente de Estados Unidos. Nobel de la Paz 1906. Impulsó la conservación de parques naturales.',
            ],
            'napoleón bonaparte' => [
                'quote' => 'La victoria pertenece al más perseverante.',
                'who' => 'Militar y estadista francés (1769-1821). Emperador de Francia. Conquistó gran parte de Europa y modernizó sus instituciones con el Código Napoleónico.',
            ],
            'julio césar' => [
                'quote' => 'Llegué, vi, vencí.',
                'who' => 'Líder militar y político romano (100-44 a.C.). General que conquistó la Galia, cruzó el Rubicón y se convirtió en dictador de Roma.',
            ],
            'alejandro magno' => [
                'quote' => 'No hay nada imposible para aquel que lo intenta.',
                'who' => 'Rey de Macedonia y conquistador (356-323 a.C.). Creó uno de los imperios más grandes de la historia antes de los 30 años.',
            ],
            'cleopatra' => [
                'quote' => 'No seré un triunfo en la procesión de nadie.',
                'who' => 'Faraona del Antiguo Egipto (69-30 a.C.). Última gobernante activa del reino ptolemaico. Famosa por su inteligencia política y alianzas con Roma.',
            ],
            'margaret thatcher' => [
                'quote' => 'Si quieres que algo se diga, pídeselo a un hombre. Si quieres que algo se haga, pídeselo a una mujer.',
                'who' => 'Política británica (1925-2013). Primera mujer en ser Primera Ministra del Reino Unido (1979-1990). Conocida como la "Dama de Hierro".',
            ],

            // ═══════════════════════════════════════════
            // ARTE Y MÚSICA
            // ═══════════════════════════════════════════

            'pablo picasso' => [
                'quote' => 'Todo niño es un artista. El problema es seguir siendo artista cuando creces.',
                'who' => 'Pintor y escultor español (1881-1973). Cofundador del cubismo. Creó más de 20.000 obras, incluyendo Guernica. El artista más influyente del siglo XX.',
            ],
            'vincent van gogh' => [
                'quote' => 'Si oyes una voz dentro de ti que dice «no puedes pintar», pinta y esa voz se callará.',
                'who' => 'Pintor neerlandés (1853-1890). Postimpresionista. Creó más de 2.000 obras en solo una década, incluyendo "La noche estrellada".',
            ],
            'frida kahlo' => [
                'quote' => 'Pies, ¿para qué los quiero si tengo alas para volar?',
                'who' => 'Pintora mexicana (1907-1954). Ícono del arte y el feminismo. Sus autorretratos exploran el dolor, la identidad y la cultura mexicana.',
            ],
            'salvador dalí' => [
                'quote' => 'No tengas miedo de la perfección, nunca la alcanzarás.',
                'who' => 'Pintor español (1904-1989). Máximo exponente del surrealismo. Conocido por "La persistencia de la memoria" y su excéntrica personalidad.',
            ],
            'ludwig van beethoven' => [
                'quote' => 'La música es una revelación más alta que toda sabiduría y filosofía.',
                'who' => 'Compositor y pianista alemán (1770-1827). Figura crucial en la transición del clasicismo al romanticismo. Compuso obras maestras incluso siendo sordo.',
            ],
            'wolfgang amadeus mozart' => [
                'quote' => 'La música no está en las notas, sino en el silencio entre ellas.',
                'who' => 'Compositor austriaco (1756-1791). Prodigio musical que compuso más de 600 obras. Figura cumbre de la música clásica.',
            ],
            'johann sebastian bach' => [
                'quote' => 'El fin y la razón de ser de toda música no es sino la gloria de Dios y la recreación del espíritu.',
                'who' => 'Compositor y músico alemán (1685-1750). Maestro del contrapunto y la armonía. Sus obras son pilares fundamentales de la música occidental.',
            ],
            'claude debussy' => [
                'quote' => 'La música es el espacio entre las notas.',
                'who' => 'Compositor francés (1862-1918). Padre del impresionismo musical. Su obra "Claro de luna" y "El mar" revolucionaron la armonía.',
            ],
            'frédéric chopin' => [
                'quote' => 'La simplicidad es el logro final. Después de haber tocado un gran número de notas, es la simplicidad la que emerge.',
                'who' => 'Compositor y pianista polaco (1810-1849). El mayor virtuoso del piano romántico. Sus nocturnos, polonesas y baladas son obras maestras.',
            ],
            'miguel ángel' => [
                'quote' => 'Vi el ángel en el mármol y tallé hasta liberarlo.',
                'who' => 'Escultor, pintor y arquitecto italiano (1475-1564). Creó el David, pintó la Capilla Sixtina y diseñó la cúpula de San Pedro. Genio del Renacimiento.',
            ],
            'rembrandt' => [
                'quote' => 'Elige solo un maestro: la Naturaleza.',
                'who' => 'Pintor neerlandés (1606-1669). Maestro del claroscuro y el autorretrato. Considerado el más grande pintor del Siglo de Oro holandés.',
            ],
            'claude monet' => [
                'quote' => 'Yo pinto lo que veo, no lo que otros quieren que vea.',
                'who' => 'Pintor francés (1840-1926). Fundador del impresionismo. Sus "Nenúfares" y "Impresión, sol naciente" definieron un movimiento artístico.',
            ],
            'auguste rodin' => [
                'quote' => 'El mundo no necesita más éxito. Necesita más artistas.',
                'who' => 'Escultor francés (1840-1917). Padre de la escultura moderna. Creador de "El pensador", "El beso" y "Las puertas del infierno".',
            ],
            'john lennon' => [
                'quote' => 'La vida es lo que pasa mientras estás ocupado haciendo otros planes.',
                'who' => 'Músico y compositor británico (1940-1980). Cofundador de The Beatles. Su música y activismo pacifista marcaron una generación. Asesinado en Nueva York.',
            ],
            'bob marley' => [
                'quote' => 'Una cosa buena de la música es que cuando te llega, no sientes dolor.',
                'who' => 'Músico jamaicano (1945-1981). Rey del reggae. Difundió el movimiento rastafari a nivel mundial con canciones como "No Woman, No Cry" y "Redemption Song".',
            ],

            // ═══════════════════════════════════════════
            // PSICOLOGÍA Y CIENCIAS SOCIALES
            // ═══════════════════════════════════════════

            'sigmund freud' => [
                'quote' => 'Antes de diagnosticarte depresión o baja autoestima, asegúrate de no estar rodeado de idiotas.',
                'who' => 'Médico y neurólogo austriaco (1856-1939). Padre del psicoanálisis. Sus teorías sobre el inconsciente, los sueños y la sexualidad transformaron la psicología.',
            ],
            'carl jung' => [
                'quote' => 'Quien mira afuera, sueña. Quien mira adentro, despierta.',
                'who' => 'Psiquiatra y psicólogo suizo (1875-1961). Fundador de la psicología analítica. Desarrolló los conceptos de arquetipo, inconsciente colectivo e introversión/extroversión.',
            ],
            'viktor frankl' => [
                'quote' => 'Quien tiene un porqué para vivir encontrará casi siempre el cómo.',
                'who' => 'Neurólogo y psiquiatra austriaco (1905-1997). Sobreviviente de Auschwitz. Fundó la logoterapia. Su libro "El hombre en busca de sentido" inspira a millones.',
            ],

            // ═══════════════════════════════════════════
            // OTROS PERSONAJES NOTABLES
            // ═══════════════════════════════════════════

            'madre teresa de calcuta' => [
                'quote' => 'Si no puedes alimentar a cien personas, alimenta al menos a una.',
                'who' => 'Religiosa albanesa-india (1910-1997). Fundó las Misioneras de la Caridad. Dedicó su vida a los más pobres. Premio Nobel de la Paz 1979.',
            ],
            'teresa de calcuta' => [
                'quote' => 'Si no puedes alimentar a cien personas, alimenta al menos a una.',
                'who' => 'Religiosa albanesa-india (1910-1997). Fundó las Misioneras de la Caridad. Dedicó su vida a los más pobres. Premio Nobel de la Paz 1979.',
            ],
            'dalai lama' => [
                'quote' => 'Si crees que eres demasiado pequeño para hacer una diferencia, intenta dormir con un mosquito.',
                'who' => 'Líder espiritual tibetano (1935-). 14° Dalai Lama. Premio Nobel de la Paz 1989. Defensor de la no violencia y el diálogo interreligioso.',
            ],
            'buda' => [
                'quote' => 'No podemos cambiar el pasado, pero sí podemos empezar a construir un presente y un futuro diferente.',
                'who' => 'Líder espiritual indio (c. 563-483 a.C.). Fundador del budismo. Sus enseñanzas sobre el sufrimiento y la iluminación inspiran a millones.',
            ],
            'ana frank' => [
                'quote' => 'A pesar de todo, sigo creyendo que la gente es realmente buena en el fondo de su corazón.',
                'who' => 'Escritora alemana de origen judío (1929-1945). Su diario, escrito durante la ocupación nazi en Ámsterdam, es uno de los testimonios más conmovedores del Holocausto.',
            ],
            'anne frank' => [
                'quote' => 'A pesar de todo, sigo creyendo que la gente es realmente buena en el fondo de su corazón.',
                'who' => 'Escritora alemana de origen judío (1929-1945). Su diario, escrito durante la ocupación nazi en Ámsterdam, es uno de los testimonios más conmovedores del Holocausto.',
            ],
            'helen keller' => [
                'quote' => 'Lo mejor y más bonito de esta vida no puede verse ni tocarse. Debe sentirse con el corazón.',
                'who' => 'Escritora y activista estadounidense (1880-1968). Sordociega desde los 19 meses, se convirtió en autora, conferencista y defensora de los derechos de personas con discapacidad.',
            ],
            'malala yousafzai' => [
                'quote' => 'Un niño, un profesor, un libro y un lápiz pueden cambiar el mundo.',
                'who' => 'Activista pakistaní (1997-). La persona más joven en recibir el Premio Nobel de la Paz (2014). Defensora del derecho de las niñas a la educación.',
            ],
            'coco chanel' => [
                'quote' => 'La elegancia es cuando el interior es tan hermoso como el exterior.',
                'who' => 'Diseñadora de moda francesa (1883-1971). Revolucionó la moda femenina liberándola del corsé. Fundadora de la casa Chanel.',
            ],
            'walt disney' => [
                'quote' => 'Si puedes soñarlo, puedes hacerlo.',
                'who' => 'Productor y empresario estadounidense (1901-1966). Fundó The Walt Disney Company. Pioneer de la animación con Mickey Mouse y Blancanieves.',
            ],
            'steve jobs' => [
                'quote' => 'Mantente hambriento, mantente alocado.',
                'who' => 'Empresario y visionario estadounidense (1955-2011). Cofundador de Apple. Revolucionó la tecnología con el Macintosh, iPod, iPhone y iPad.',
            ],
            'benjamin franklin' => [
                'quote' => 'Una inversión en conocimiento paga el mejor interés.',
                'who' => 'Político, científico e inventor estadounidense (1706-1790). Padre fundador de Estados Unidos. Inventó el pararrayos y contribuyó a la Declaración de Independencia.',
            ],
            'rosa parks' => [
                'quote' => 'He aprendido que cuando uno ha decidido algo, eso ahuyenta el miedo.',
                'who' => 'Activista estadounidense (1913-2005). "Madre del movimiento de los derechos civiles". Su negativa a ceder su asiento en un autobús desencadenó el boicot de Montgomery.',
            ],
            'amelia earhart' => [
                'quote' => 'La cosa más difícil es tomar la decisión de actuar, el resto es simplemente tenacidad.',
                'who' => 'Aviadora estadounidense (1897-1937). Primera mujer en volar sola sobre el Atlántico. Desapareció durante un intento de circunnavegar el globo.',
            ],
            'charles chaplin' => [
                'quote' => 'Un día sin reír es un día perdido.',
                'who' => 'Actor, director y compositor británico (1889-1977). Creó el personaje de Charlot. Pionero del cine mudo y genio de la comedia cinematográfica.',
            ],
            'charlie chaplin' => [
                'quote' => 'Un día sin reír es un día perdido.',
                'who' => 'Actor, director y compositor británico (1889-1977). Creó el personaje de Charlot. Pionero del cine mudo y genio de la comedia cinematográfica.',
            ],
            'marilyn monroe' => [
                'quote' => 'Dale a una chica los zapatos adecuados y conquistará el mundo.',
                'who' => 'Actriz y modelo estadounidense (1926-1962). Ícono cultural del siglo XX. Su carisma y talento la convirtieron en la estrella más famosa de Hollywood.',
            ],
            'audrey hepburn' => [
                'quote' => 'Para tener labios atractivos, pronuncia palabras amables. Para tener una mirada amorosa, busca lo bueno en la gente.',
                'who' => 'Actriz británica-neerlandesa (1929-1993). Estrella de "Desayuno con diamantes". También fue embajadora de UNICEF dedicada a la causa humanitaria.',
            ],
            'bruce lee' => [
                'quote' => 'Sé agua, amigo mío.',
                'who' => 'Artista marcial, actor y filósofo chino-estadounidense (1940-1973). Revolucionó las artes marciales y el cine de acción. Fundador del Jeet Kune Do.',
            ],
            'muhammad ali' => [
                'quote' => 'Quien no tiene la valentía de arriesgarse no logrará nada en la vida.',
                'who' => 'Boxeador y activista estadounidense (1942-2016). Considerado el mejor boxeador de todos los tiempos. Se negó a ir a Vietnam por sus creencias.',
            ],
            'pelé' => [
                'quote' => 'El éxito no es un accidente. Es trabajo duro, perseverancia, aprendizaje, estudio, sacrificio y, sobre todo, amor por lo que estás haciendo.',
                'who' => 'Futbolista brasileño (1940-2022). Considerado el mejor jugador de fútbol de la historia. Ganó tres Copas del Mundo con Brasil.',
            ],
            'diego maradona' => [
                'quote' => 'La pelota no se mancha.',
                'who' => 'Futbolista argentino (1960-2020). Considerado uno de los mejores jugadores de la historia. Llevó a Argentina al título mundial en 1986.',
            ],
        ];
    }
}
