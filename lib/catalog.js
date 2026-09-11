// Acervo Trilha Viva - catalogo real, gerado a partir da pasta do Drive.
// Uma linha por arquivo do acervo, no formato:
//   Titulo|Banda|Tom|BPM|VS|Versao|Participacao|Tambem aparece em
// Os campos vazios no fim da linha sao omitidos. "VS" marca o que e MP3
// mixado, e nao multitrack. Quando o mesmo titulo da mesma banda aparece em
// mais de um arquivo (tom diferente, versao ao vivo, outro formato), o site
// junta tudo em UMA musica e guarda os arquivos em song.variantes.
const RAW = `
5 Pães e 2 Peixinhos|4 Por 1|E|70
Espírito Enche Minha Vida|4 Por 1
Jesus em Tua Presença|4 Por 1
Nada É Impossível|4 Por 1
Nada É Impossível|4 Por 1|E|142
Ao Que Está Assentado Sobre o Trono|Alessandro Vilas Boas
Firmado na Rocha|Alessandro Vilas Boas|B
Maranata|Alessandro Vilas Boas|C|136
O Carpinteiro|Alessandro Vilas Boas
O Carpinteiro|Alessandro Vilas Boas
Quero Conhecer Jesus|Alessandro Vilas Boas
Ser Mudado|Alessandro Vilas Boas
Tu És Tudo|Alessandro Vilas Boas|D|126
Vem Habitar|Alessandro Vilas Boas|E|116
Yeshua|Alessandro Vilas Boas|G|68
Buscar-me-eis e Me Achareis|Alex Lúcio|D|128
O Fogo Arderá|Alex Lúcio|C|130||Ao Vivo
Alfa e Omega|Aline Barros|F|130
Autor da Vida|Aline Barros
Bem Aventurado|Aline Barros
Bem Mais que Tudo|Aline Barros|A|128
Caminho de Milagres|Aline Barros
Consagração|Aline Barros
Consagração Louvor ao Rei|Aline Barros|G|125||Ao Vivo
Depois da Cruz|Aline Barros
Diante da Cruz|Aline Barros|D
Digno É o Senhor|Aline Barros
Encontro Perfeito|Aline Barros
Feliz Demais|Aline Barros
Geração Bem Aventurada|Aline Barros
Jeová Jireh|Aline Barros
Leva-me aos Sedentos|Aline Barros
Lugar Seguro|Aline Barros
Poder da Cruz|Aline Barros
Poder pra Salvar|Aline Barros||150
Primeira Essência|Aline Barros
Rendido Estou|Aline Barros|D|165|||Fernandinho|Fernandinho
Rompendo em Fé|Aline Barros
Sonda-me|Aline Barros
Sonda-me|Aline Barros
Tua Palavra|Aline Barros
Tudo É Teu|Aline Barros|G|150||Ao Vivo
Vem Chegando o Natal|Aline Barros
Vento do Espírito|Aline Barros
Vitória no Deserto|Aline Barros
Vitória no Deserto|Aline Barros||||Versão 2
Vou Te Alegrar|Aline Barros
A Glória É Tua|Anderson Freire
A Igreja Vem|Anderson Freire
Canção do Céu|Anderson Freire
Deserto|Anderson Freire
Efésios 6|Anderson Freire
Ele Chegou|Anderson Freire
Medley|Anderson Freire||||Medley
Raridade|Anderson Freire
A Bênção|André Aquino
Em Seu Nome|André Aquino
Pai de Amor|André Aquino
Poderoso Deus|André Aquino
Quando Ele Vem|André Aquino
Quebro Meu Vaso|André Aquino
Vai Chover de Novo|André Aquino
Vem Incendiar Meu Coração|André Aquino
Em Espírito|Arieta Magrini
Grande É o Senhor Inversões|Arieta Magrini|G|64
Seja Engrandecido|Arieta Magrini|E|67
Até que o Senhor Venha|Atos 2 Worship|C#m
Medley Pentecostal|Atos 2 Worship||||Medley
Na Unção de Deus|Atos 2 Worship|C|135
Único + Que Ele Cresça|Atos 2 Worship|A|135
Agradeço|Baruk|A|77
Cantarei Teu Amor|Baruk
Grato Sou|Baruk|B|130
Isso É Amor|Baruk|C|125
Lá (A Tua Mão Está)|Baruk
Lá (A Tua Mão Está)|Baruk
Meu Respirar|Baruk|Bb|64
Na Casa|Baruk||128
O Amor de Deus + Logo Eu|Baruk||||Ao Vivo
Santo Espírito (Holy Spirit)|Baruk||||Ao Vivo|Leonardo
Sobre a Graça|Baruk
Be Enthroned|Bethel Music
Center|Bethel Music||||Ao Vivo
Champion|Bethel Music||72
Closer|Bethel Music
Deep Cries Out|Bethel Music
Egypt|Bethel Music|Ab|75
God of Revival|Bethel Music|Bb
Holy Forever|Bethel Music
King of My Heart|Bethel Music
King of My Heart|Bethel Music||||Versão 2
No Longer Slaves|Bethel Music|Bb|74
Pai Nosso|Bethel Music|B|140
Raise a Hallelujah|Bethel Music|Db|82
Reckless Love|Bethel Music
Stand in Your Love|Bethel Music
The Blood|Bethel Music|G|74
This Is Amazing Grace|Bethel Music|C|99
Touch of Heaven|Bethel Music
We Praise You|Bethel Music|A|85
Como Flecha|Carol Braga
Em Teu Nome|Carol Braga
Fiel a Mim|Carol Braga|G#|99
Fogo que Consome|Carol Braga|E|131
Me Batiza com Fogo|Carol Braga|D|120||Ao Vivo
O Escudo|Carol Braga
Palavras|Carol Braga|G
Sou um Milagre|Carol Braga|F
A Casa É Sua|Casa Worship||134
Atraídos pelo Fogo|Casa Worship
Em Tua Presença|Casa Worship|F|150
Era Eu|Casa Worship
És Bom pra Mim|Casa Worship
Eu Te Vejo em Tudo|Casa Worship
Fogo em Teus Olhos|Casa Worship
Não Se Apagará|Casa Worship
O Céu É o Meu Lugar|Casa Worship|C|145
O Céu É o Meu Lugar|Casa Worship||145
O Céu É o Meu Lugar|Casa Worship||145||Versão 2
Seu Amor Me Persegue|Casa Worship
Yeshua|Casa Worship
500 Graus|Cassiane
Com Muito Louvor|Cassiane
O Leão e o Cordeiro|Cassiane||70
Santidade|Cassiane||94
Give Me Jesus (Quero Jesus)|Central 3
Quero Jesus|Central 3||139
Rei da Glória|Central 3|Dm|75
Tem a Ver com Ele|Central 3||137
Tem Tudo a Ver com Ele|Central 3
Tu És Bom|Central 3
Até Que Eu Não Consiga Mais Ficar de Pé|Daniel Berg|Db
Mateus 28|Daniel Berg|B|145||Ao Vivo|Marcelo Markes|Marcelo Markes
Abraça-me|David Quinlan
Abraça-me|David Quinlan
Águas Profundas|David Quinlan
Essência da Adoração|David Quinlan
Geração que Dança|David Quinlan
Que Ele Cresça|Deigma Marques
Anseio|Diante do Trono|F
Canção Apocalipse|Diante do Trono
Coração Igual ao Teu|Diante do Trono
Debaixo dos Nossos Pés|Diante do Trono|C|112
Deus do Recomeço|Diante do Trono
Deus Reina|Diante do Trono|C|138
Digno É o Cordeiro|Diante do Trono
Eis-me Aqui|Diante do Trono||66
Grande|Diante do Trono|Am|112
Hosana|Diante do Trono
Medley Israel|Diante do Trono|A|112||Medley
Medley Tempo de Festa|Diante do Trono||||Ao Vivo
Outra Vez|Diante do Trono
Outra Vez|Diante do Trono||86
Quero Subir|Diante do Trono
Relance|Diante do Trono|C|70
Sim e Amém|Diante do Trono
Só o Senhor É Deus|Diante do Trono
Tempo de Festa|Diante do Trono|G|148
Tetelestai|Diante do Trono|G
Tudo em Todos|Diante do Trono
Venha a Mim|Diante do Trono
Lá Vou Eu|Discopraise
Ouvir o Teu Falar|Discopraise
Se Eu Me Humilhar|Discopraise
Canção de Simeão|DROPS|A|70
É Ele|DROPS|Bb|140
Em uma Só Voz|DROPS||||Ao Vivo
Grato Sou|DROPS|B
Pardal|DROPS
Quem É Aquele|DROPS|A|146||Ao Vivo|Andre Aquino|André Aquino
Tua Alegria|DROPS|B|130||Ao Vivo
Tudo É Teu|DROPS|Bb|138
Estações|Dunamis Music|C|152
Sobre as Águas|Dunamis Music|E|166
Tudo É pra Tua Glória|Dunamis Music
Volto os Meus Olhos|Dunamis Music|E|146
Santificação|Elaine Martins
Been So Good|Elevation Worship|Gb|73
Come Again|Elevation Worship|B|69
Digno (Worthy)|Elevation Worship|D|135
Echo|Elevation Worship|D|104
Eco|Elevation Worship|D|104
Forever YHWH|Elevation Worship|Gb|71|||Tiffany Hudson
Forever YHWH|Elevation Worship|||||Tiffany Hudson
God I'm Just Grateful|Elevation Worship|D|72||Ao Vivo
Goodbye Yesterday|Elevation Worship
Grateful|Elevation Worship
Graves Into Gardens|Elevation Worship
Hallelujah Here Below|Elevation Worship|D
Here as in Heaven|Elevation Worship
Jehovah|Elevation Worship||100
Leão (Lion)|Elevation Worship|Dm|67
More Than Able|Elevation Worship|Eb|73
My Testimony|Elevation Worship|B|97
O Come to the Altar|Elevation Worship
Only King Forever|Elevation Worship
Praise|Elevation Worship
Praise|Elevation Worship||127
Resurrecting|Elevation Worship
See a Victory|Elevation Worship
The Blessing|Elevation Worship
Washed|Elevation Worship
With You|Elevation Worship
A Mesa|Eli Soares
A Tua Glória|Eli Soares
Anjos Te Louvam|Eli Soares
Aos Pés da Cruz|Eli Soares
Canta Minh'alma|Eli Soares
Cantarei Teu Amor|Eli Soares|D|135
Corpo e Família|Eli Soares|||||Kesia
Grande É o Senhor|Eli Soares
Não Há Barreiras|Eli Soares|E
Santo|Eli Soares|B|100
Se Eu Cair|Eli Soares
Segura na Mão de Deus|Eli Soares|C|104
Shekinah|Eli Soares
Tudo que Eu Sou|Eli Soares
Vem Com Josué Lutar em Jericó|Eli Soares|C#m
Fiel a Mim|Eyshila|G|180
Aclame ao Senhor|Felipe Rodrigues|F|70
Até que o Senhor Venha (Medley)|Felipe Rodrigues||67
Digno É o Senhor|Felipe Rodrigues|E
Digno É o Senhor|Felipe Rodrigues|E|138||Ao Vivo
Em Tua Presença|Felipe Rodrigues
Eu Sou Teu|Felipe Rodrigues|||||Théo Rubia|Théo Rubia
Exaltado ao Vivo|Felipe Rodrigues|C|86||Ao Vivo
Fogo em Teus Olhos + Eu Navegarei|Felipe Rodrigues|Fm|140
Gratidão (6/8)|Felipe Rodrigues|Bb|156
Gratidão (6/8)|Felipe Rodrigues|D|156
Primeira Essência|Felipe Rodrigues|Ab|69
Saudade|Felipe Rodrigues|Bb|120
Sobre as Águas|Felipe Rodrigues
Tudo É Perda|Felipe Rodrigues|C#|126
A Tua Glória Faz|Fernanda Brum
Amo o Senhor|Fernanda Brum
Apenas um Toque|Fernanda Brum|F|92
Espírito Santo|Fernanda Brum|G|176
Eu Vou|Fernanda Brum
Eu Vou|Fernanda Brum|D|129
O Que a Tua Glória Fez Comigo|Fernanda Brum|F|140
O que Sua Glória Fez Comigo|Fernanda Brum
Onde o Fogo Não Se Apaga|Fernanda Brum
Redenção|Fernanda Brum
Via Dolorosa|Fernanda Brum
Videira|Fernanda Brum|B|154
A Alegria do Senhor|Fernandinho
A Seu Sangue + Infinitamente (Medley Mineirão)|Fernandinho||||Medley
Adestra|Fernandinho
Ainda que a Figueira|Fernandinho
Batiza-me|Fernandinho
Caminho no Deserto|Fernandinho|E|136
Dançar na Chuva|Fernandinho||||Ao Vivo
Dono do Mundo|Fernandinho
É Proibido|Fernandinho
É Tempo de Abrir o Coração|Fernandinho
Eis que Estou à Porta|Fernandinho
Emanuel|Fernandinho||158
Eu Jamais Serei o Mesmo|Fernandinho
Eu Me Levanto|Fernandinho
Eu Vou Amanhecer|Fernandinho
Eu Vou Subir a Montanha|Fernandinho|Bbm|108
Faz Chover|Fernandinho|D|140
Fogo Consumidor|Fernandinho
Fogo do Céu|Fernandinho
Fogo Santo|Fernandinho
Galileu|Fernandinho|C#|116
Grandes Coisas|Fernandinho
Infinitamente Mais|Fernandinho
Jesus Filho de Deus|Fernandinho
Jesus Filho de Deus Drive Onze|Fernandinho|A|76
Maravilhosa Graça|Fernandinho
Me Leva em Casa|Fernandinho
Moisés|Fernandinho
Moisés|Fernandinho
Moisés|Fernandinho||138
Nada Além do Sangue|Fernandinho||77
O Hino|Fernandinho
O Senhor É Bom|Fernandinho|G
Os que Confiam|Fernandinho|Bm|110
Quão Bom|Fernandinho
Raba|Fernandinho|Gm|128|||Baruk|Baruk
Santa Euforia|Fernandinho
Se Não For para Te Adorar|Fernandinho
Senhor dos Exércitos|Fernandinho
Seu Nome É Jesus|Fernandinho
Seu Sangue|Fernandinho
Sou Feliz|Fernandinho|D#|110
Todas as Coisas|Fernandinho||148
Um Dia em Tua Casa|Fernandinho
Um Dia em Tua Presença|Fernandinho
Una Nueva Historia|Fernandinho
Único|Fernandinho||146
Venha o Teu Reino|Fernandinho|G#|140
Yahweh|Fernandinho|A|71
A Boa Parte|FHOP Music|E|144
Bendito É o Rei|FHOP Music|D|148
Canção Eterna|FHOP Music|Bbm|140
Colossenses e Suas Linhas de Amor|FHOP Music
Digno de Tudo|FHOP Music|D|69
Dono da Minha Afeição|FHOP Music|C|74
Exaltamos Yahweh|FHOP Music|E|112
Fé|FHOP Music|E|78
Gratidão (6/8)|FHOP Music|D|78
Há Poder|FHOP Music|B|76
Indesculpável|FHOP Music|Bm|78
Maria, Tu Sabias|FHOP Music|G#m|90
Meia Noite|FHOP Music|Bm|98
Nada Mais|FHOP Music|D|136
Nada Mais|FHOP Music|D|68
Nosso Coração Queima|FHOP Music|C|128
Ó Noite Santa|FHOP Music|G|74
O Pequeno Baterista|FHOP Music|D|104
Obediência|FHOP Music|E|122
Os que Olham para Ti|FHOP Music
Povo Se Prepare|FHOP Music|F#m|74
Ruja o Leão|FHOP Music
Ruja o Leão 2.0|FHOP Music
Só Quero Ver Você|FHOP Music
Sublime|FHOP Music|D|125
Sublime|FHOP Music|D|125||Versão 2
Tu És + Águas Purificadoras|FHOP Music||71
Único|FHOP Music|G|135
Ambição|Gabi Sampaio|Ebm|145
Até Que Toda Terra Cante|Gabi Sampaio|G|71
Bom Perfume|Gabi Sampaio
Bom Perfume|Gabi Sampaio
Como Não Te Amar|Gabi Sampaio|G|130
Digno de Tudo + Nada Mais Satisfaz + Até Que Nada Mais Importe|Gabi Sampaio
Digno É o Cordeiro|Gabi Sampaio|A|65
Digno É o Senhor|Gabi Sampaio|Ab
És Tão Valioso|Gabi Sampaio||||Ao Vivo
Essência da Adoração|Gabi Sampaio
Eu Vou Construir com Guia|Gabi Sampaio
Grande Rei|Gabi Sampaio
Meu Respirar|Gabi Sampaio||67
Na Terra Como no Céu|Gabi Sampaio
Não a Nós|Gabi Sampaio|A|134
Onipotente|Gabi Sampaio|Am|80
Rei do Meu Coração|Gabi Sampaio
Seja Tudo em Mim|Gabi Sampaio|Ab|64
Teu Toque|Gabi Sampaio|A|136
Unção Pelo Ar|Gabi Sampaio|D|70
Vitorioso|Gabi Sampaio||70
Vitorioso És + Com Muito Louvor + Agnus Dei|Gabi Sampaio
A Bênção|Gabriel Guedes
Amazing Pianos 7|Gabriel Guedes
Canção ao Cordeiro|Gabriel Guedes
Confio em Ti|Gabriel Guedes|B|65
Ele Vem|Gabriel Guedes
Filho|Gabriel Guedes|D|63
In Memoriam|Gabriel Guedes|C|102
Lá na Cruz|Gabriel Guedes|C|72
Minhas Guerras|Gabriel Guedes
Noiva|Gabriel Guedes
Outro Igual Não Há|Gabriel Guedes
Santo|Gabriel Guedes
Todos os Meus Dias|Gabriel Guedes
Vitorioso És|Gabriel Guedes
A Ele a Glória|Gabriela Rocha
Atos 2|Gabriela Rocha
Atos 2|Gabriela Rocha|G|158
Canção do Céu|Gabriela Rocha|E|71
Canção do Céu|Gabriela Rocha||142||Ao Vivo
Céu|Gabriela Rocha
Correrei|Gabriela Rocha||69
Deus Está Aqui|Gabriela Rocha
És o Amor|Gabriela Rocha|Ab|68
Espírito, Enche a Minha Vida|Gabriela Rocha
Eu Creio (Believe For It)|Gabriela Rocha
Eu Navegarei|Gabriela Rocha
Eu Navegarei|Gabriela Rocha
Eu Sou Teu|Gabriela Rocha
Hino da Vitória|Gabriela Rocha|E|136
Hino da Vitória|Gabriela Rocha|E|68
Hosana|Gabriela Rocha||||Original
Leão|Gabriela Rocha
Lugar Secreto|Gabriela Rocha
Lugar Secreto|Gabriela Rocha
Me Aproximou|Gabriela Rocha|A
Me Atraiu|Gabriela Rocha|G|64
Meu Coração É Teu|Gabriela Rocha|D|66
Meu Jesus|Gabriela Rocha
Meu Respirar + Meu Prazer|Gabriela Rocha|F#|64
Nos Braços do Pai|Gabriela Rocha
Poderoso Deus|Gabriela Rocha|Ab|67||Medley
Poderoso Deus (Medley)|Gabriela Rocha||||Ao Vivo
Senhor Formoso És + Ele É Exaltado|Gabriela Rocha
Teu Santo Nome|Gabriela Rocha
Teu Santo Nome|Gabriela Rocha|G|142||Ao Vivo
Toda Terra|Gabriela Rocha
Tuas Águas|Gabriela Rocha
Vida aos Sepulcros|Gabriela Rocha
Vida aos Sepulcros|Gabriela Rocha||70
Algo Novo Vindo|Get Worship||91
Assim Seja Deus|Get Worship
Confio em Ti|Get Worship||135
Ele Aqui Está|Get Worship|B|103
Era Eu|Get Worship|Ab|66
Gratidão|Get Worship
Gratidão|Get Worship|B|78
Que Jesus Seja o Nome|Get Worship|Db|128
Senhor Tu És Bom|Get Worship||||Original
Sou Grato por Seu Amor|Get Worship|D|72
Um Novo Dia|Get Worship||151
Estou Livre|Heloísa Rosa
Há um Lugar|Heloísa Rosa||||Ao Vivo
Jesus É o Caminho|Heloísa Rosa
Veja (Behold)|Heloísa Rosa
Yeshua|Heloísa Rosa|A|69
Yeshua|Heloísa Rosa|||||Fernandinho|Fernandinho
Anchor|Hillsong
Another in the Fire|Hillsong
At The Cross|Hillsong||||Ao Vivo
At The Cross|Hillsong||||Ao Vivo
Avivamento|Hillsong
Beautiful Exchange|Hillsong
Behold (Then Sings My Soul)|Hillsong
Behold Then Sings My Soul|Hillsong|B|74
Boa Graça|Hillsong|A|71
Conmigo Estas|Hillsong
Echoes (Till We See The Other Side)|Hillsong
Eu Me Rendo (I Surrender)|Hillsong||||Ao Vivo
Eu Me Rendo (I Surrender)|Hillsong||||Original
Falling Into You|Hillsong
Forever Reign|Hillsong|C|83
God Is Able|Hillsong|B|79
Hosanna|Hillsong||||Ao Vivo
No Other Name|Hillsong
Oceans (Where Feet May Fail)|Hillsong|D
Phenomena|Hillsong|F|132
Real Love|Hillsong|D|140
Rei dos Reis (King of Kings)|Hillsong
Salvation Is Here|Hillsong
Scandal of Grace|Hillsong|Bb
Show Me Your Glory|Hillsong
So Will I (100 Billion X)|Hillsong
The Stand|Hillsong
This I Believe|Hillsong||||Ao Vivo
This Is Living|Hillsong
This Is Living|Hillsong
Tu És (You)|Hillsong
Wake|Hillsong
You|Hillsong|B|143
You Saw Me|Hillsong
Yours Forever|Hillsong
Fogo em Teus Olhos|IIR|G|135
Somos Um|IIR||165
Canção de Jonas|Ipalpha
Cristo Venceu|Ipalpha|A|76
Maravilhosa Graça|Ipalpha
Teu Povo|Ipalpha|A|67
Abertura|Isadora Pompeo||140
Alegria|Isadora Pompeo
Bênçãos que Não Têm Fim|Isadora Pompeo|C|166
Como Nunca Antes|Isadora Pompeo
Eu Tenho Você|Isadora Pompeo
Minha Morada|Isadora Pompeo
Nada Pode Calar um Adorador|Isadora Pompeo
Nome de Jesus|Isadora Pompeo||77
Seja Forte|Isadora Pompeo
Apocalipse 4|Isaías Saad
Bondade de Deus|Isaías Saad||||Ao Vivo
Enche-me|Isaías Saad
Inexplicável Amor|Isaías Saad
Ruja o Leão + Que Se Abram|Isaías Saad|||||Nívea Soares|Nívea Soares
Seu Amor|Isaías Saad
Friend of God|Israel Houghton
Friend of God (Medley)|Israel Houghton||||Medley
In Jesus Name|Israel Houghton
In Jesus Name|Israel Houghton||||Versão 2
Jesus En El Centro|Israel Houghton
Más Y Más|Israel Houghton
Medley You Are Good|Israel Houghton|E|133||Medley
More Than Enough|Israel Houghton
Our God Reigns|Israel Houghton
Our God Reigns|Israel Houghton|||||Bj Putnam Our God Reigns
Poder de Tu Victoria|Israel Houghton|B
Risen|Israel Houghton
Te Amo|Israel Houghton
Te Llamo Cristo|Israel Houghton
Tu Presencia Es El Cielo|Israel Houghton
You Are Good|Israel Houghton
Avante|Israel Salazar
Aviva-nos|Israel Salazar
Canção ao Cordeiro|Israel Salazar|E|134
Deus Conosco|Israel Salazar
Enche Essa Casa|Israel Salazar|A|98
És Bem Vindo|Israel Salazar||130
Espírito Santo|Israel Salazar|D|100
Eu Quero Mais|Israel Salazar
Eu Tô no Culto|Israel Salazar|B|138
Graça|Israel Salazar|D|158
Graça Avante|Israel Salazar|D
Jesus É Poderoso|Israel Salazar
Me Ama|Israel Salazar|C|73
Nasceu em Belém|Israel Salazar|C|110
No Meio dos Louvores|Israel Salazar||||Ao Vivo
Pode Chover|Israel Salazar|F#m|158
Rei da Glória|Israel Salazar|B|107
Reina em Mim|Israel Salazar|Bbm|111
Tu És o Rei + No Meio dos Louvores|Israel Salazar|G|130
Tudo o que Me Prometeu|Israel Salazar|G|134
Vento que Vem|Israel Salazar||||Ao Vivo
Vitória na Cruz|Israel Salazar|Dm|140
Acende Outra Vez|Jefferson e Suellen
Ele Reina|Jefferson e Suellen
Ele Vem|Jefferson e Suellen|D|69
Labareda|Jefferson e Suellen
Vem Me Buscar|Jefferson e Suellen
Aleluia|Jesus Culture
Freedom|Jesus Culture
Holy Spirit|Jesus Culture
Holy Spirit|Jesus Culture||||Ao Vivo
In the River|Jesus Culture
Move|Jesus Culture|Db|92
Rooftops|Jesus Culture
Santo|Jesus Culture
Tuyo Soy|Jesus Culture
Your Love Never Fails|Jesus Culture
Além do Rio Azul|Júlia Vitória
Canção dos Redimidos|Júlia Vitória
Começo Meio e Fim|Júlia Vitória
De Dentro pra Fora|Júlia Vitória
Esperança|Júlia Vitória|||||Gabriel Guedes|Gabriel Guedes
João Viu|Júlia Vitória
Redimido|Júlia Vitória|G#|144
Som das Águas|Júlia Vitória||97
Tuas Águas|Júlia Vitória
Canção que Não Envelhece|Julliany Souza|Fm|135
Colossenses 1|Julliany Souza|Gb|68
Coração Igual ao Teu|Julliany Souza|G|128
Deus É Quem Me Fortalece|Julliany Souza
Eu e Minha Casa|Julliany Souza
Fiel É Deus|Julliany Souza|F|162
Fumaça|Julliany Souza
Leão de Judá|Julliany Souza|G#|74||Ao Vivo
Meu Prazer|Julliany Souza|G|62
Quem É Esse?|Julliany Souza|Gb|62
Quem Poderá|Julliany Souza||144
Yahweh Se Manifestará|Julliany Souza|G|69
Minha Escolha Diária|Kailane Frauches
Compaixão|Lagoinha Worship|A|71
Exaltado|Lagoinha Worship|E|72
Mais|Lagoinha Worship|D|142
Novo Tempo|Lagoinha Worship
Preciso de Ti|Lagoinha Worship
Promessa|Lagoinha Worship|A#|172
Provisão|Lagoinha Worship
Sinais e Maravilhas|Lagoinha Worship
Sopra Deus|Lagoinha Worship
Tão Perto|Lagoinha Worship
Vencedor|Lagoinha Worship|C|95
Em Teus Braços|Laura Souguellis|C|136
Incensário|Laura Souguellis|B|130
Mais Perto (Closer)|Laura Souguellis|E|140
Só Quero Ver Você|Laura Souguellis|C|128
As Sete Trombetas|Lauriete
Deus dos Deuses|Lauriete||75
Ele Me Ama|Livres para Adorar|||VS
Em Outro Lugar|Livres para Adorar|||VS
Eu Vou Construir|Livres para Adorar
Fez um Caminho pra Mim|Livres para Adorar|||VS
Grand Finale|Livres para Adorar|||VS
Leva-me|Livres para Adorar|||VS
Mais Forte que a Morte|Livres para Adorar
Mais Forte que a Morte|Livres para Adorar|||VS
Mais um Dia|Livres para Adorar|||VS|Acústico
Milagres|Livres para Adorar
Nunca Me Deixou|Livres para Adorar|||VS
Nunca Me Deixou|Livres para Adorar|||VS
O Ladrão em Mim|Livres para Adorar|||VS
Porque Ele Vive|Livres para Adorar|||VS
Pregação (DVD)|Livres para Adorar|||VS
Quando o Mundo Cai ao Meu Redor|Livres para Adorar|||VS
Quando o Mundo Cai ao Meu Redor|Livres para Adorar|||VS
Ridículo|Livres para Adorar|||VS
Ruas de Papel|Livres para Adorar|||VS
Santo|Livres para Adorar|||VS
Teu Amor Não Falha|Livres para Adorar|||VS
Uma Vida Inteira|Livres para Adorar|||VS
Uma Vida Inteira|Livres para Adorar|||VS
Vai Valer a Pena|Livres para Adorar|||VS
Vai Valer a Pena|Livres para Adorar|||VS
Esperança|Lukas Agustinho|G|138||Ao Vivo
O Escudo + Sou um Milagre|Lukas Agustinho|D|140||Ao Vivo
Além do Impossível|Marcelo Markes|Db|69
Dependente|Marcelo Markes
Eu Tenho Você|Marcelo Markes
Nunca Mudou|Marcelo Markes|Bb|71
Redentor|Marcelo Markes|G|66
1 Tm 3.16|Marcus Salles
Estamos de Pé|Marcus Salles
Maria, Saibas Que|Marcus Salles
O Cordeiro e o Leão|Marcus Salles
Vem Habitar|Marcus Salles||142
Alfa e Ômega|Marine Friesen
Não Me Envergonharei|Marine Friesen|G
Óleo de Alegria|Marine Friesen
A Casa Eu Arrumei|Mateus Brito|B|70
Advento|Mateus Brito|C|70
Bom Tesouro|Mateus Brito
Coração de Maria|Mateus Brito
Intro + A Alegria|Mateus Brito|F#m|146||Ao Vivo
Loucura|Mateus Brito
Morada|Mateus Brito|Db|67
Não Temo Ondas|Mateus Brito|Eb|65
O Nosso General|Mateus Brito|B|140
Ruja o Leão|Mateus Brito
Tua Presença Vale Mais|Mateus Brito|Bb|66
Cómo Te Amamos|Maverick City|G|70
I Thank God|Maverick City|Db|130
In the Room|Maverick City|B|104
Jireh|Maverick City||70
Júbilo|Maverick City|D|135
Mary Did You Know|Maverick City|C||||Chandler Moore Lizzie Morgan Maverick
Promises|Maverick City
Jó 66|Midian Lima
Não Pare|Midian Lima
Shekinah|Midian Lima
Abertura|Morada||145
Ao Único|Morada
Desenvolvendo Amor|Morada
Dia e Noite|Morada
Diante de Ti|Morada|E|144
É Tudo Sobre Você|Morada|C|69
Emaús|Morada|B
Espelhos Mágicos|Morada|D|66
Eu Te Quero + Ainda Que a Figueira|Morada
Grande É o Senhor + Louvor ao Rei + Te Exaltamos + Ele É o Senhor|Morada
Intro Jesus|Morada
Isaías 6|Morada
Jesus em Tua Presença|Morada||71
Louvemos ao Senhor|Morada
Medley Leão de Judá|Morada||||Medley
Nosso General|Morada|C#m|130||Original
Oh Se Fendesses|Morada|C|69
Oh! Se Fendesses|Morada|B|69
Para Onde Eu Irei|Morada
Para que Entre o Rei|Morada
Primeiro Amor|Morada|D|57
Puro e Simples|Morada|E|120
Senhor, Te Quero + Ele Vem + Tudo Diferente|Morada||132
Só Tu És Santo|Morada
Só Tu És Santo|Morada
Só Tu És Santo|Morada
Te Louvarei + Nome Sobre Todo Nome|Morada
Tudo É Teu|Morada
Tudo É Teu|Morada|B|158
Vida Longa ao Rei|Morada
Acende o Fogo + Eu Me Prostro|Nívea Soares|D|68
Em Tua Presença|Nívea Soares
Em Tua Presença|Nívea Soares|G
Eu Me Prostro|Nívea Soares
Eu Vou Construir|Nívea Soares
Filho do Deus Vivo|Nívea Soares||134
Grande É o Senhor|Nívea Soares|D
Hosana|Nívea Soares|B|105
Me Entrego a Ti|Nívea Soares
O Senhor É Bom|Nívea Soares
Os que Esperam|Nívea Soares
Pela Fé|Nívea Soares
Que Se Abram os Céus|Nívea Soares
Reina o Senhor|Nívea Soares
Rio|Nívea Soares|C|116||Ao Vivo
Sua Justiça Prevalecerá|Nívea Soares|Bm|154
Teu Amor Não Falha|Nívea Soares
Tu És Bom|Nívea Soares
Um Só|Nívea Soares||125
Endless Praise|Planetshakers|D|128
Estoy Asombrado|Planetshakers
Nada É Impossível (Remix)|Planetshakers|Db|136||Remix
Show Me Your Glory|Planetshakers||||Ao Vivo
Sou Livre (Free Indeed)|Planetshakers
Tudo É Pra Ti (All My Life)|Planetshakers
Turn It Up|Planetshakers
Walls|Planetshakers
130|Projeto Sola|Bm|105
Até Outra Vez (Bênção)|Projeto Sola|D|||Ao Vivo
Confiança|Projeto Sola
Da Vida o Melhor|Projeto Sola|Db|73
Dádiva|Projeto Sola|A|75
Efésios 1|Projeto Sola|C|82
Eterno Lar (Homem Litúrgico Tour 74)|Projeto Sola|D|||Ao Vivo
Êxodo + Homem Litúrgico (Tour 77)|Projeto Sola|Dm|50||Ao Vivo
Êxodo + Homem Litúrgico (Tour 77)|Projeto Sola|Dm|50||Ao Vivo
Glorificar|Projeto Sola|Bb|74
Homem Deus|Projeto Sola|Gm|174
Isaías 53|Projeto Sola|D
Nosso Rei|Projeto Sola|B|110
Oh Vem Emanuel|Projeto Sola
Redenção|Projeto Sola|D|125
Ele É o Leão|Reino Music|C#m|92
1000 Graus|Renascer Praise|C|153
De Volta À Vida|Renascer Praise|D|140
Deus Agiu|Renascer Praise|Eb|83
Escape|Renascer Praise|D|64||Original
Eu Me Rendo|Renascer Praise||75
Marcado|Renascer Praise|B|145
Novo Dia Novo Tempo|Renascer Praise|C|140
O Plano Perfeito|Renascer Praise
Pelo Sangue|Renascer Praise
Plano Melhor|Renascer Praise|Bb|117
Processos e Propósitos|Samuel Mariano|G|66
Respira|Samuel Mariano|F|67
Deixa Eu Te Usar|Sarah Farias
Caia Fogo|Sarah Oliveira
Deus Tremendo|Shirley Carvalhaes|A|106
Vendavais|Shirley Carvalhaes
Medley Corinhos de Fogo|Som e Louvor||85||Medley
Caminho no Deserto|Soraya Moraes
A Começar por Mim|Sued|C#|142
Galileu|Sued||126
Na Fenda da Rocha|Sued|F|70
O Nome Dele|Sued
500 Graus|Thalles Roberto|D|104
500 Graus na Lagoinha Alphaville|Thalles Roberto||104||Ao Vivo
Arde Outra Vez|Thalles Roberto
Com Muito Louvor|Thalles Roberto
Deus da Minha Vida|Thalles Roberto|F
Ele É Contigo|Thalles Roberto
Jacó Segurou o Anjo|Thalles Roberto
Lleno del Espíritu Santo|Thalles Roberto
Aquieta Minh'alma|Thamiris Garcia
Aquieta Minh'alma|Thamiris Garcia|A|124
Ele Vem pra Restaurar|Thamiris Garcia
Nunca Foi Sobre Nós + Doxologia|Thamiris Garcia|C|124||Ao Vivo
A Alegria do Senhor|Théo Rubia|Bm|144
Até Que Eu Não Consiga Mais Ficar de Pé|Théo Rubia
Coisas Novas|Théo Rubia|Bb
Diante de Ti|Théo Rubia|E|128
Eu Só Quero Tua Presença|Théo Rubia
Eu Só Quero Tua Presença|Théo Rubia
Manifestação dos Filhos de Deus|Théo Rubia|B|70
Manifestação dos Filhos de Deus|Théo Rubia|||||Morada|Morada
Obsessão|Théo Rubia||||Ao Vivo
Pela Manhã|Théo Rubia
Pode Morar Aqui|Théo Rubia
Quero Mais|Théo Rubia
Um Milhão de Anos|Théo Rubia|Bb|134
Aleluia Hosana|Toque no Altar
Bendito Eu Serei|Toque no Altar|G|73
Deus de Promessas|Toque no Altar
Deus do Impossível|Toque no Altar||140
Eu Vou Viver uma Virada|Toque no Altar
Faz Chover|Toque no Altar
Restitui|Toque no Altar
Sete Vezes Mais|Toque no Altar
Te Louvarei|Toque no Altar
Toda Sorte de Bençãos|Toque no Altar
Árvore Cortada|Valesca Mayssa||66
Dia Após Dia|Valesca Mayssa
Eis-me Aqui|Valesca Mayssa||73
Eu Sou Teu Pai|Valesca Mayssa||65
Inflama|Valesca Mayssa|F|103
O Encontro|Valesca Mayssa
Tinta de Sangue|Valesca Mayssa|F|134
Ousado Amor|Vigília dos Asafes
Toca em Mim de Novo 2.0|Vigília dos Asafes
A Rocha|Vineyard
Entrega (Surrender)|Vineyard|||||Heloísa Rosa|Heloísa Rosa
Eterno Deus|Vineyard||115
Me Derramar|Vineyard
Meu Respirar|Vineyard|G|60|||Nívea Soares|Nívea Soares
Quebrantado|Vineyard
Reina em Mim|Vineyard
Reina em Mim|Vineyard||||Versão 2
Senhor Te Quero|Vineyard
Só Tenho a Ti|Vineyard
Tão Profundo|Vineyard
Tão Profundo|Vineyard
Tu És Bom|Vineyard||144
Vem, Esta É a Hora|Vineyard
`.trim()

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

const ADORACAO = ['adora', 'santo', 'presenca', 'presença', 'teu amor', 'lugar secreto', 'oceanos', 'aquieta', 'em teus braços', 'sonda', 'enche', 'atrai', 'quero mergulhar', 'coração de joelhos', 'digno', 'jardim', 'yeshua', 'teu santo nome', 'o teu amor', 'minha morada', 'rendo', 'entrego', 'altar', 'holy', 'worthy', 'espírito']
const CELEBRACAO = ['vitória', 'celebra', 'grandes coisas', 'hino', 'cantem', 'todo poderoso', 'a ele a glória', 'sonhe grande', 'um novo dia', 'vai passar', 'sou um milagre', 'atos 2', 'alegria', 'ele vem', 'festa', 'dança', 'medley', 'aleluia', 'glória', 'reina', 'rei ', 'leão']
const MINISTRACAO = ['cura', 'deserto', 'milagre', 'restitui', 'sobrevivi', 'não temerei', 'liberta', 'cicatrizes', 'acalma', 'espera', 'depois do fim', 'favor de deus', 'volte a sonhar', 'era a mão de deus', 'deus de futuro', 'fogo', 'batalha', 'guerra', 'promessa', 'socorro', 'consolo']

function categoria(title) {
  const t = title.toLowerCase()
  if (ADORACAO.some((k) => t.includes(k))) return 'Adoração'
  if (CELEBRACAO.some((k) => t.includes(k))) return 'Celebração'
  if (MINISTRACAO.some((k) => t.includes(k))) return 'Ministração'
  return 'Congregacional'
}

// Um item por LINHA do acervo. Vira "variante" de uma musica.
const itens = RAW.split('\n')
  .map((line) => {
    const [title, artist, tom, bpm, vs, versao, part, tambem] = line.split('|').map((s) => (s || '').trim())
    if (!title || !artist) return null
    return {
      title,
      artist,
      tom: tom || '',
      bpm: bpm || '',
      tipo: vs === 'VS' ? 'VS MP3' : 'Multitrack',
      versao: versao || '',
      part: part || '',
      tambem: tambem || '',
    }
  })
  .filter(Boolean)

const porSlug = new Map()
for (const it of itens) {
  const slug = slugify(`${it.title}-${it.artist}`)
  let song = porSlug.get(slug)
  if (!song) {
    const h = hash(slug)
    song = {
      slug,
      title: it.title,
      artist: it.artist,
      categoria: categoria(it.title),
      hue: h % 360,
      hue2: ((h % 360) + 40 + (h % 60)) % 360,
      seed: h % 997,
      tipo: it.tipo,
      part: it.part,
      tambem: it.tambem,
      variantes: [],
    }
    porSlug.set(slug, song)
  }
  if (it.part && !song.part) song.part = it.part
  if (it.tambem && !song.tambem) song.tambem = it.tambem
  if (it.tipo === 'Multitrack') song.tipo = 'Multitrack'
  song.variantes.push({ tom: it.tom, bpm: it.bpm, versao: it.versao, tipo: it.tipo })
}

export const songs = [...porSlug.values()].sort((a, b) =>
  a.title.localeCompare(b.title, 'pt-BR')
)

// Quantos arquivos o acervo tem de verdade (maior que songs.length, porque
// uma musica pode ter mais de uma versao).
export const totalArquivos = itens.length

export const artists = [...new Set(songs.map((s) => s.artist))].sort((a, b) =>
  a.localeCompare(b, 'pt-BR')
)

export const categorias = [...new Set(songs.map((s) => s.categoria))].sort()

export function getSong(slug) {
  return songs.find((s) => s.slug === slug)
}

// Vitrine da home. A ordem do acervo e alfabetica, e alfabetica a home
// abriria com "1 Tm 3.16" e "5 Paes e 2 Peixinhos". Esta lista e escolhida a
// mao, com louvor que a igreja canta. Para trocar, e so mexer nos slugs.
const DESTAQUE = [
  'ousado-amor-vigilia-dos-asafes',
  'bondade-de-deus-isaias-saad',
  'lugar-secreto-gabriela-rocha',
  'grandes-coisas-fernandinho',
  'so-tu-es-santo-morada',
  'yeshua-casa-worship',
  'nada-alem-do-sangue-fernandinho',
  'raridade-anderson-freire',
  'a-casa-e-sua-casa-worship',
  'caminho-no-deserto-fernandinho',
  'deus-de-promessas-toque-no-altar',
  'rendido-estou-aline-barros',
  'ruja-o-leao-fhop-music',
  'atos-2-gabriela-rocha',
  'me-atraiu-gabriela-rocha',
  'digno-e-o-cordeiro-diante-do-trono',
  'santo-eli-soares',
  'holy-forever-bethel-music',
  'jireh-maverick-city',
  'reckless-love-bethel-music',
  'porque-ele-vive-livres-para-adorar',
  'tudo-e-teu-morada',
  'galileu-fernandinho',
  'pai-nosso-bethel-music',
]

export const destaques = DESTAQUE.map((slug) => getSong(slug)).filter(Boolean)

export function relatedSongs(song, n = 6) {
  const sameArtist = songs.filter((s) => s.artist === song.artist && s.slug !== song.slug)
  const sameCat = songs.filter(
    (s) => s.categoria === song.categoria && s.artist !== song.artist && s.slug !== song.slug
  )
  return [...sameArtist, ...sameCat].slice(0, n)
}
