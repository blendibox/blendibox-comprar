// google_product_category (GPC) de cada produto pro feed do Google Merchant /
// Pinterest. A Pinterest avisa (aviso 157) quando o item não traz esse campo, e o
// Merchant Center também usa pra decidir onde mostrar o produto. O valor é o ID
// numérico da taxonomia oficial do Google (taxonomy-with-ids.pt-BR.txt, versão
// 2021-09-21) — ID vale em qualquer idioma do feed e a lista completa de IDs
// válidos está em google-product-taxonomy-ids.json (todo ID usado aqui é
// conferido contra ela quando o módulo carrega).
//
// Ordem de decisão (a primeira que bater vence):
//   1. a categoria da própria loja, quando ela já manda o ID do Google (Gigantec,
//      O Boticário, Zee.Now... — categorySlug 100% numérico e existente na taxonomia);
//   2. categorySlug conhecido (ex: peças de ar-condicionado da LG);
//   3. peça de reposição de eletrodoméstico (não é o aparelho em si);
//   4. palavras do título, por vertical (regras abaixo, da mais específica pra mais geral);
//   5. padrão da loja (ex: Technos = relógios, Lego = brinquedos de montar);
//   6. padrão do vertical (categoria ampla, mas sempre válida).
// Nunca devolve vazio: o pior caso é a categoria ampla do vertical.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const VALID_IDS = new Set(JSON.parse(readFileSync(path.join(HERE, 'google-product-taxonomy-ids.json'), 'utf8')))

const FASHION = ['moda', 'esporte', 'joias']
const WEAR = ['moda', 'esporte']
const HOME = ['casa']
const TECH = ['casa', 'eletronicos']

// [regex sobre o título normalizado (minúsculo, sem acento, sem pontuação), ID, verticais onde vale]
const RULES = [
  // ---- Palavra única, vale em qualquer vertical ----
  [/\benergetico\b/, 5723],
  [/\bpneus?\b/, 911, ['automotivo']],

  // ---- Relógios (Technos, Vivara, Samsung...) ----
  [/\b(pulseiras?|correias?) (de |para )?(relogio|smartwatch|watch)/, 5122, [...FASHION, 'eletronicos']],
  [/\b(relogio|relogios|smartwatch|smartwatches|smartband)\b/, 201, [...FASHION, 'eletronicos']],

  // ---- Joias ----
  [/\b(kit|conjunto|trio|duo)\b/, 6463, ['joias']],
  [/\b(anel|aneis|alianca|aliancas|solitario)\b/, 200, ['joias', 'moda']],
  [/\b(brinco|brincos|argola|argolas|ear cuff|earcuff)\b/, 194, ['joias', 'moda']],
  [/\b(colar|colares|gargantilha|choker|chocker|corrente|correntes|cordao|escapulario)\b/, 196, ['joias', 'moda']],
  [/\b(pulseira|pulseiras|bracelete|braceletes)\b/, 191, ['joias', 'moda']],
  [/\b(pingente|pingentes|berloque|berloques|charm|charms|medalha|separador|separadores)\b/, 192, ['joias', 'moda']],
  [/\b(caneta|canetas|esferografica|rollerball|refil)\b/, 6065, FASHION],
  [/\btornozeleiras?\b/, 189, ['joias', 'moda']],
  [/\bpiercings?\b/, 190, ['joias', 'moda']],

  // ---- Bolsas e acessórios (a ordem importa: "3 em 1 de ombro, transversal e mochila" é bolsa) ----
  [/\bchaveiros?\b/, 175, FASHION],
  [/\bnecessaires?\b/, 108, FASHION],
  [/\bpochetes?\b/, 104, WEAR],
  [/\b(transversal|tiracolo|crossbody)\b/, 106, WEAR],
  [/\b(bolsa|bolsas|tote|clutch|baguete|bag|bags)\b/, 3032, FASHION],
  [/\b(mochila|mochilas|backpack)\b/, 100, WEAR],
  [/\b(mala|malas|bagagem|maleta|valise|frasqueira)\b/, 5181, WEAR],
  [/\b(carteira|carteiras|porta cartao|porta cartoes|porta moedas|porta documentos)\b/, 2668, FASHION],
  [/\blancheiras?\b/, 669, WEAR],

  // ---- Calçados e roupas (moda + esporte) ----
  [/\b(palmilha|palmilhas|cadarco|cadarcos)\b/, 1933, WEAR],
  // meia antes de sapato: "Kit 9 Pares de Meias Soquete Sapatilha" é meia, não calçado
  [/\b(meia|meias|meiao|meioes)\b/, 209, WEAR],
  [/\b(tenis|sandalia|sandalias|chinelo|chinelos|sapatilha|sapatilhas|bota|botas|botina|botinas|chuteira|chuteiras|sapato|sapatos|mocassim|mocassins|rasteira|rasteirinha|rasteirinhas|papete|slide|slides|tamanco|tamancos|scarpin|sneaker|sneakers|havaianas|crocs|galocha|alpargata|oxford)\b/, 187, WEAR],
  // modelos de tênis da Nike que vêm sem a palavra "tênis" no título ("Nike Dunk Low", "Air Max 90")
  [/\b(dunk|air max|air force|pegasus|vomero|p 6000|infinityrn|structure|downshifter|revolution|journey run|court vision|cortez|invincible|zoom fly|metcon|free run|waffle|vaporfly)\b/, 187, WEAR],
  [/\bcintos?\b/, 169, WEAR],
  [/\boculos (de )?(natacao|mergulho|snorkel)\b/, 988, WEAR],
  [/\boculos\b/, 178, FASHION],
  [/\b(luva|luvas|mitene|mitenes)\b/, 170, WEAR],
  [/\b(bone|bones|chapeu|chapeus|viseira|bucket)\b/, 173, WEAR],
  [/\b(gorro|gorros|touca|toucas|bandana|tiara)\b/, 2020, WEAR],
  [/\b(cueca|cuecas|calcinha|calcinhas|sutia|sutias|lingerie|boxer)\b/, 213, WEAR],
  [/\b(biquini|bikini|maio|sunga|sungas|roupa de banho)\b/, 211, WEAR],
  [/\b(pijama|pijamas|camisola|camisolas|roupao)\b/, 208, WEAR],
  [/\b(vestido|vestidos)\b/, 2271, WEAR],
  [/\b(macacao|macaquinho|jardineira|body|bodies)\b/, 5182, WEAR],
  [/\b(conjunto|conjuntos)\b/, 7313, WEAR],
  [/\b(saia|saias)\b/, 1581, WEAR],
  [/\b(short|shorts|bermuda|bermudas|calcao|calcoes)\b/, 207, WEAR],
  [/\b(jaqueta|casaco|colete)\b.*\bjeans\b|\bjeans\b.*\b(jaqueta|casaco|colete)\b/, 203, WEAR],
  [/\b(calca|calcas|legging|leggings|jogger|joggers|jeans|cargo|tights?|culote|corsario|pantalona)\b/, 204, WEAR],
  [/\b(jaqueta|jaquetas|casaco|casacos|moletom|blusao|blusoes|agasalho|colete|coletes|corta vento|parka|sobretudo|capa de chuva|cardigan|sueter|pulover|anorak|blazer|blazers|poncho|kimono)\b/, 203, WEAR],
  [/\b(camiseta|camisetas|camisa|camisas|blusa|blusas|regata|regatas|polo|top|tops|cropped|manga longa|jersey|casaca|bata|batas|tunica|tunicas|t shirt|tshirt)\b/, 212, WEAR],

  // ---- Aparelhos pessoais (barbeador, secador, chapinha...) ----
  // Vêm antes das regras de beleza ("secador de cabelo" não é cuidado capilar) e
  // antes de "aparador" (móvel).
  [/\b(barbeador|barbeadores|aparador de (pelos|barba|cabelo)|depilador|secador de cabelo|prancha alisadora|chapinha|prancha mq|modelador|cortador de cabelo|maquina de cortar cabelo|maquina de corte|clipper|escova secadora|escova alisadora|escova rotativa)\b/, 528, [...TECH, 'beleza']],

  // ---- Beleza ----
  [/\blentes? de contato\b/, 1380, ['beleza']],
  [/\b(kit presente|combo presente|presente|presentes|cesta de presente|coffret)\b/, 475, ['beleza']],
  [/\b(perfume|perfumes|colonia|eau de|parfum|fragrancia|deo colonia|deo parfum|body splash|body spray|bruma perfumada)\b/, 479, ['beleza', 'joias', 'moda']],
  [/\b(esmalte|esmaltes|unha|unhas|removedor de esmalte)\b/, 478, ['beleza']],
  [/\b(desodorante|antitranspirante|antiperspirante)\b/, 484, ['beleza']],
  [/\b(shampoo|xampu|condicionador|mascara capilar|leave in|finalizador|creme para pentear|ativador de cachos|tonico capilar|capilar|cabelo|cabelos|tintura|coloracao)\b/, 486, ['beleza']],
  [/\b(creme dental|pasta de dente|enxaguante|bucal|escova dental|fio dental)\b/, 526, ['beleza']],
  [/\b(sabonete|sabonetes|locao corporal|hidratante corporal|corporal|body lotion|banho|shower|oleo corporal|manteiga corporal|creme para as maos|creme para maos|sais de banho)\b/, 474, ['beleza']],
  [/\b(batom|batons|gloss|base liquida|base mate|po compacto|po facial|rimel|mascara de cilios|sombra|sombras|blush|corretivo|iluminador|delineador|lapis de olho|lapis labial|paleta|primer|maquiagem|make|pincel|pinceis|cilios|sobrancelha|bronzer)\b/, 477, ['beleza']],
  [/\b(hidratante|creme facial|serum|protetor solar|filtro solar|bloqueador|sabonete facial|tonico|limpeza facial|anti idade|antissinais|acido hialuronico|vitamina c|esfoliante|mascara facial|demaquilante|agua micelar|facial|rugas|clareador|antioxidante)\b/, 567, ['beleza']],

  // ---- Pet (gato antes de cão: a regra de cão é a que pega "para cães e gatos") ----
  [/\b(racao|racoes|sache|pate|alimento|alimentos)\b.*\bgatos?\b|\bgatos?\b.*\b(racao|racoes|sache|pate|alimento|alimentos)\b/, 3367, ['pet']],
  [/\b(racao|racoes|sache|pate|alimento|alimentos|molho natural)\b/, 3530, ['pet']],
  [/\b(regata|moletom|camiseta|jaqueta|vestido|casaco|pijama|fantasia|sueter|roupinha|roupa)\b/, 5004, ['pet']],
  [/\barranhador(es)?\b/, 4997, ['pet']],
  [/\b(snack|snacks|petisco|petiscos|bifinho|bifinhos|osso|palito|biscoito)\b.*\bgatos?\b|\bgatos?\b.*\b(snack|snacks|petisco|petiscos|bifinho|bifinhos)\b/, 5002, ['pet']],
  [/\b(snack|snacks|petisco|petiscos|bifinho|bifinhos|osso|palito|biscoito)\b/, 5011, ['pet']],
  [/\bareia (sanitaria|higienica)\b/, 4999, ['pet']],
  [/\bcaixa de areia\b/, 5000, ['pet']],
  [/\b(shampoo|condicionador)\b/, 6406, ['pet']],
  [/\b(antipulgas|vermifugo|carrapaticida|anti inflamatorio|antibiotico|antiparasitario|comprimidos|suplemento|vitamina)\b/, 5086, ['pet']],
  [/\b(fralda|fraldas|tapete higienico)\b/, 7372, ['pet']],
  [/\b(coleira|coleiras|peitoral|peitorais)\b/, 6250, ['pet']],
  [/\b(guia|guias)\b/, 6249, ['pet']],
  [/\b(roupa|roupinha|capa|vestuario)\b/, 5004, ['pet']],
  [/\b(cama|camas|caminha|caminhas)\b.*\bgatos?\b/, 4433, ['pet']],
  [/\b(cama|camas|caminha|caminhas)\b/, 4434, ['pet']],
  [/\bbrinquedos?\b.*\bgatos?\b|\bgatos?\b.*\bbrinquedos?\b/, 5001, ['pet']],
  [/\bbrinquedos?\b/, 5010, ['pet']],

  // ---- Eletrodomésticos e eletrônicos (LG, Brastemp, Consul, Samsung, Kabum, Gigantec...) ----
  [/\b(geladeira|refrigerador|refrigeradores|frigobar|freezer)\b/, 686, TECH],
  [/\b(fogao|fogoes|cooktop|cooktops)\b/, 685, TECH],
  [/\b(micro ondas|microondas)\b/, 753, TECH],
  [/\b(lava loucas|lava louca)\b/, 680, TECH],
  [/\b(lavadora|lavadoras|maquina de lavar|secadora|secadoras|tanquinho|ferro de passar|passadeira a vapor)\b|\blava e seca \w*\s?\d+\s?kg/, 2706, TECH],
  [/\b(ar condicionado|ar condicionados|split|climatizador|umidificador|desumidificador)\b/, 1626, TECH],
  [/\b(ventilador|ventiladores|circulador)\b/, 608, TECH],
  [/\b(purificador de ar|purificadores de ar)\b/, 606, TECH],
  [/\b(aspirador|aspiradores)\b/, 619, TECH],
  [/\b(cafeteira|cafeteiras|maquina de cafe|nespresso)\b/, 736, TECH],
  [/\b(fritadeira|fritadeiras|air fryer|airfryer)\b/, 738, TECH],
  [/\b(liquidificador|batedeira|processador de alimentos|multiprocessador|mixer|sanduicheira|torradeira|chaleira|grill|forno|fornos|coifa|depurador|adega|cervejeira|espremedor|panela eletrica|extrator|arrozeira)\b/, 730, TECH],
  [/\b(headset|headsets)\b/, 543627, TECH],
  [/\b(fone|fones|headphone|headphones|earbuds|earphone)\b/, 543626, TECH],
  [/\b(soundbar|sound bar|caixa de som|caixa acustica|home theater|alto falante|speaker)\b/, 2154, TECH],
  [/\b(projetor|projetores)\b/, 396, TECH],
  [/\b(monitor|monitores)\b/, 305, TECH],
  [/\b(notebook|notebooks|laptop|macbook|chromebook)\b/, 328, TECH],
  [/\b(tablet|tablets|ipad|galaxy tab)\b/, 4745, TECH],
  [/\b(capa|capinha|pelicula|carregador|cabo de dados)\b.*\b(galaxy|iphone|celular|smartphone|samsung|motorola|moto)\b|\b(galaxy|iphone|celular|smartphone|samsung|motorola|moto)\b.*\b(capa|capinha|pelicula|carregador|cabo de dados)\b/, 2082, TECH],
  [/\b(celular|smartphone|iphone)\b/, 267, TECH],
  [/\bimpressora 3d\b/, 6865, TECH],
  [/\b(impressora|impressoras|multifuncional)\b/, 500106, TECH],
  [/\b(nobreak|no break|estabilizador)\b/, 1348, TECH],
  [/\b(mouse pad|mousepad)\b/, 6475, TECH],
  [/\b(mouse|mouses)\b/, 304, TECH],
  [/\b(teclado|teclados)\b/, 303, TECH],
  [/\bcadeira (gamer|de escritorio|office)\b/, 2045, TECH],
  [/\b(televisao|televisor|smart tv|tv)\b/, 404, TECH],
  [/\b(pc gamer|computador|desktop|all in one|mini pc)\b/, 325, TECH],
  [/\b(placa mae|placa mae)\b/, 289, TECH],
  [/\b(placa de video|geforce|radeon|rtx|gtx)\b/, 287, TECH],
  [/\b(fonte de alimentacao|fonte atx|fonte modular)\b/, 291, TECH],
  [/\b(cooler|water cooler|watercooler|ventoinha|dissipador|fan|fans)\b/, 295, TECH],
  [/\bgabinete\b/, 296, TECH],
  [/\b(memoria|ddr4|ddr5)\b/, 288, TECH],
  [/\b(ssd|hd|hdd|nvme|pen drive|cartao de memoria|disco rigido)\b/, 2414, TECH],
  [/\b(processador|ryzen|intel core|cpu)\b/, 292, TECH],
  [/\b(roteador|access point|repetidor)\b/, 1350, TECH],
  [/\b(switch|hub)\b/, 2479, TECH],
  [/\b(cabo|adaptador)\b/, 259, TECH],
  [/\bjogo\b.*\b(switch|xbox|playstation|ps4|ps5|nintendo)\b/, 1279, TECH],

  // ---- Móveis, decoração e utilidades (Mobly, Yamamura...) ----
  [/\b(luminaria|luminarias|pendente|pendentes|abajur|lustre|lustres|plafon|plafons|arandela|arandelas|spot|spots|lampada|lampadas|fita led|refletor|trilho)\b/, 594, HOME],
  [/\b(sofa|sofas|sofa cama|chaise|namoradeira)\b/, 460, HOME],
  [/\b(poltrona|poltronas)\b/, 6859, HOME],
  [/\b(pufe|pufes|puff|puffs)\b/, 458, HOME],
  [/\b(banqueta|banquetas|banco|bancos)\b/, 441, HOME],
  [/\b(cadeira|cadeiras)\b/, 443, HOME],
  [/\b(guarda roupa|guarda roupas|roupeiro)\b/, 4063, HOME],
  [/\b(rack|racks|painel para tv|home para tv)\b/, 457, HOME],
  [/\b(estante|estantes|nicho|nichos|prateleira|prateleiras)\b/, 464, HOME],
  [/\b(colchao|colchoes)\b/, 2696, HOME],
  [/\b(berco|bercos)\b/, 554, HOME],
  [/\b(cama|camas|beliche|cabeceira|cabeceiras|bicama)\b/, 6433, HOME],
  [/\b(mesa de centro|mesas de centro)\b/, 1395, HOME],
  [/\b(criado mudo|mesa de cabeceira)\b/, 462, HOME],
  [/\b(armario|armarios|comoda|comodas|sapateira|sapateiras|gaveteiro|cristaleira|despensa|closet|cozinha completa)\b/, 6356, HOME],
  [/\b(travesseiro|travesseiros)\b/, 2700, HOME],
  [/\b(toalha|toalhas)\b/, 4077, HOME],
  [/\b(lencol|lencois|edredom|edredons|fronha|fronhas|colcha|colchas|cobertor|cobertores|manta|mantas|jogo de cama|protetor de colchao)\b/, 4171, HOME],
  [/\b(espelho|espelhos)\b/, 595, HOME],
  [/\b(tapete|tapetes)\b/, 598, HOME],
  [/\b(almofada|almofadas)\b/, 4454, HOME],
  [/\b(panela|panelas|frigideira|frigideiras|cacarola|cacarolas|assadeira|assadeiras|wok|caldeirao)\b/, 6070, HOME],
  [/\b(prato|pratos|copo|copos|taca|tacas|xicara|xicaras|talher|talheres|faqueiro|jogo de jantar|aparelho de jantar|jarra|travessa|tigela|caneca|canecas|garrafa|garrafas|jogo americano|porta copos|descanso de panela|guardanapo|guardanapos)\b/, 672, HOME],
  [/\b(faca|facas|tabua|escorredor|ralador|abridor|peneira|espatula|concha|colher|colheres|pegador|descascador)\b/, 668, HOME],
  [/\b(pote|potes|marmita|marmitas)\b/, 2626, HOME],
  [/\b(mesa|mesas|escrivaninha|aparador|bancada|bufe|buffet|penteadeira|balcao)\b/, 6392, HOME],
  [/\b(lixeira|saboneteira|porta escova|toalheiro|chuveiro)\b/, 574, HOME],
  [/\b(quadro|quadros|vaso|vasos|enfeite|enfeites|escultura|esculturas|porta retrato|porta retratos|cortina|cortinas|persiana|vela|velas|difusor|cesto|cestos|adorno|guirlanda|moldura|molduras|cachepo|cachepot|bandeja|bandejas)\b/, 696, HOME],
]

// Peça de reposição / garantia estendida de eletrodoméstico ou TV (Consul,
// Brastemp, LG...): não é o aparelho em si, então não pode cair em
// "geladeira"/"fogão"/"monitor". Três sinais:
//   - "para <aparelho>" no título ("Trempe Para Fogão");
//   - "garantia estendida" (a taxonomia do Google não tem categoria de serviço;
//     "acessórios para eletrodomésticos" é a mais próxima);
//   - o título termina com o código repetido ("... - W10526985 W10526985"), MAS a
//     LG também repete o modelo nos aparelhos inteiros ("Lavadora LG 11KG ...
//     - FV3011WG4A - FV3011WG4A"), então esse sinal só vale quando o título não
//     começa com nome de aparelho.
const PART_CODE_REPEATED = /\b([a-z0-9][a-z0-9-]{6,})\b[\s-]*\1\s*$/i
const PART_FOR_APPLIANCE = /\bpara (geladeira|refrigerador|freezer|fogao|cooktop|forno|maquina de lavar|lavadora|lava loucas|micro ondas|microondas|cervejeira|ar condicionado|secadora|lava e seca)\b|\bgarantia estendida\b/
const APPLIANCE_TITLE_START =
  /^(ar condicionado|ar portatil|split|lavadora|lava e seca|lava loucas|secadora|geladeira|refrigerador|freezer|frigobar|fogao|cooktop|forno|micro ondas|microondas|coifa|depurador|adega|cervejeira|monitor|smart tv|tv|televisao|soundbar|projetor|aspirador|purificador|climatizador|combo|kit|maquina de lavar|notebook|computador|all in one|fone|headset|caixa de som|liquidificador|batedeira|cafeteira|fritadeira|air fryer)\b/
const PART_OF_SCREEN = /\b(tv|televisao|monitor|all in one|soundbar|audio)\b/

const NOT_PART_MERCHANTS = new Set(['mobly', 'spicy'])

function isSparePart(rawTitle, text) {
  if (PART_FOR_APPLIANCE.test(text)) return true
  return PART_CODE_REPEATED.test(rawTitle) && !APPLIANCE_TITLE_START.test(text)
}

// categorySlug conhecido de feeds que mandam o nome da categoria em vez do ID.
const SLUG_CATEGORY = {
  'pecas-e-acessorios-de-ar-condicionado': 2367,
  'acessorios-para-eletrodomesticos': 3348,
  'pecas-e-acessorios-para-tv-audio': 2082,
  'pecas-e-acessorios-para-televisao': 2082,
  televisions: 404,
  'computer-monitors': 305,
  projectors: 396,
  speakers: 2154,
  'kitchen-appliances': 730,
  'washing-machines': 2706,
  'climate-control-appliances': 1626,
  'air-conditioners': 1626,
  cookware: 6070,
}

// Padrão da loja inteira, quando o catálogo dela é de um tipo só.
const MERCHANT_DEFAULT = {
  technos: 201, // relógios (inclui os "Kit Technos" e o contador de tempo)
  lego: 1254, // brinquedos de montar
  blendibox: 3032, // bolsas (necessaires, chaveiros e transversais pegam as regras acima)
  kippling: 5181, // malas e bolsas (estojo, sacola... sem a palavra "bolsa" no título)
  legalelover: 784, // livros e cursos de direito: a taxonomia não tem "curso", o mais próximo é livro
  gigantec: 222, // hardware de informática, mesmo estando no vertical "casa"
  kabum: 222,
  samsung: 222,
  motorola: 222,
  lg: 222,
  brastemp: 604, // peças e eletrodomésticos
  consul: 604,
  electrolux: 604,
  compracerta: 604,
  sharkninja: 604,
  panasonic: 604,
  spicy: 638, // utensílios de cozinha
  yamamura: 594, // iluminação
  decorcolors: 696, // decoração
}

// Categoria ampla (sempre existente) pra quando nada acima bateu.
const VERTICAL_DEFAULT = {
  casa: 536, // Casa e jardim
  esporte: 988, // Artigos esportivos
  pet: 2, // Suprimentos para animais de estimação
  beleza: 473, // Cuidados pessoais > Cosméticos
  joias: 188, // Joias
  eletronicos: 222, // Eletrônicos
  moda: 166, // Vestuário e acessórios
  brinquedos: 1253, // Brinquedos
  livros: 784, // Mídia > Livros
  saude: 491, // Saúde e beleza > Cuidados com a saúde
  automotivo: 888, // Veículos e peças
}
const FALLBACK_ID = 536
const PART_ACCESSORY_ID = 3348 // Casa e jardim > Acessórios para eletrodomésticos
const PART_SCREEN_ID = 2082 // Eletrônicos > Acessórios para eletrônicos

for (const id of [
  ...RULES.map((r) => r[1]),
  ...Object.values(SLUG_CATEGORY),
  ...Object.values(MERCHANT_DEFAULT),
  ...Object.values(VERTICAL_DEFAULT),
  FALLBACK_ID,
  PART_ACCESSORY_ID,
  PART_SCREEN_ID,
]) {
  if (!VALID_IDS.has(id)) throw new Error(`google-product-category: ID ${id} não existe na taxonomia do Google`)
}

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// → { id, source }  (source: 'loja' | 'slug' | 'peca' | 'regra' | 'loja-padrao' | 'vertical')
export function classifyGoogleProductCategory(product) {
  const slug = String(product.categorySlug || '')
  if (/^\d+$/.test(slug) && VALID_IDS.has(Number(slug))) return { id: Number(slug), source: 'loja' }
  if (SLUG_CATEGORY[slug]) return { id: SLUG_CATEGORY[slug], source: 'slug' }

  const vertical = product.vertical
  const text = normalize(product.productName)

  // Mobly e Spicy vendem móveis e utensílios ("Armário com nicho para micro-ondas"): lá "para <aparelho>" não é peça.
  if (TECH.includes(vertical) && !NOT_PART_MERCHANTS.has(product.merchantSlug) && isSparePart(String(product.productName || '').trim(), text)) {
    return { id: PART_OF_SCREEN.test(text) ? PART_SCREEN_ID : PART_ACCESSORY_ID, source: 'peca' }
  }

  for (const [pattern, id, only] of RULES) {
    if (only && !only.includes(vertical)) continue
    if (pattern.test(text)) return { id, source: 'regra' }
  }

  if (MERCHANT_DEFAULT[product.merchantSlug]) return { id: MERCHANT_DEFAULT[product.merchantSlug], source: 'loja-padrao' }
  return { id: VERTICAL_DEFAULT[vertical] ?? FALLBACK_ID, source: 'vertical' }
}

export function googleProductCategory(product) {
  return classifyGoogleProductCategory(product).id
}
