/* Genetic Football
a genetic algo experiment
Josh Millard 2015 */

/* TODO
	- all kinds of stuff but also

	- FAAAAAAAAACEEEEES

	- fix case where ballcarrier can make a diagonal move from the corner of the fair play area
		to the out-of-bounds area above opposite endzone and thus escape the universe

	- rewrite endleft/field/endright definitions to include a pre-calculated right and bottom coord
		in addition to top and left and width/height, to make bounds-checking less of a snarl
		of additions and shit

	- rework start-of-play player distribution code to make sure the offensive QB can't literally
		start the play out of bounds and score a safety

	- stats, stats, stats
		- add a larger variety of player/team/league stats that the game can generate to the page
			and users can look through, if they're the stat-happy sorts.
		- track history in detail: retain game-by-game records for players and teams so that
			the current state of things can be compared with the past in more detail than just
			raw W/L/T counts and career yard/TD/tackle/etc sums.

	- graphs, graphs, graphs
		- with historical stats, it'd be possible to generate graphs of various things over time,
			like player value over time, team W/L ratio over time, etc

	- for mating and cloning, inheriting a surname from parent would be a nice touch; possibly allow
		for complicated things like hyphenated surnames and the Jr, III, IV, etc postfix if the
		offspring takes both first and last name

	- per above, also add parent1 and parent2 fields to players, to track the chain of ancestry
		back as another potential data-tracking detail

	- rewrite how league/game/fitness defaults are handled so they're written *to* the page based
		on values set in the code here, rather than taken from hardcoded values in the index.html
		tags themselves; also, manage updating internal values as a hook off events generated over
		there, rather than just reading the DOM more often than necessary. (Will also fix IE11 
		slider value issue.)

	- collect various stray globals into a couple containers objects; most of the global constants
		in the code could rightly go into a Game object, with the the remainder probably fitting
		well into a Display object for stuff relating to page/canvas/etc.

	- regularize some of the function calls that have mismatching or incongruous names as baggage
		from the hacky initial drafts of the code

	- IE11 does not approve of the current hacky approach of setting default values in index.html for
		sliders and such and then pulling .val() from that at runtime; doesn't seem to accept values
		as real until the slider has actually been manipulated by the player.

*/

"use strict";

// our html canvas object
var thecanvas = document.getElementById("main");
var context = thecanvas.getContext("2d");

// game clock and per-play clock
var gameclockmax = 120; // number of seconds left in the game
var playclockmax = 10; // number of seconds left in the current play
var gameclock;
var playclock;
var gamesplayed = 0;

// define screen coordinates of our canvas
var world = new Object();
world.w = 160;
world.h = 160;
var canvasscale = 5; // internal-to-screen scaling ratio;

// define boundaries and canvas position of the playing field with endzones
var field = new Object();
field.x = 30; // position of top-left corner of in-play field area
field.y = 5;

field.endleft = new Object();
field.endright = new Object();
field.play = new Object();

field.endleft.x = -20;
field.endleft.y = 0;
field.endleft.w = 20;
field.endleft.h = 60;
field.endleft.color = "#44aa44";

field.play.x = 0;
field.play.y = 0;
field.play.w = 100;
field.play.h = 60
field.play.color = "#88dd66";

field.endright.x = 100;
field.endright.y = 0;
field.endright.w = 20;
field.endright.h = 60;
field.endright.color = "#44aa44";


var teamdefs;
var leaguesize = 8; // number of teams in the league; this can't be bigger than teamdefs.length!
var teamsize = 4; // number of players per team

var framestandard = 30;
var turbo = 1; // sim speed mult. factor
var framelimit = framestandard / turbo; // how many ms per frame we'll try for
var frameskip = (framelimit / 1000) * turbo; // how much time to pull of play/game clocks per frame

var playdelay = 1 / turbo; // how long to stay on current play once it ends
var preplaydelay = 0.5 / turbo; // how long to stay on new play after it's been set up before action

var los = 50; // line of scrimmage, where on the field the play begins from.

//////// a bunch of global definitions just to be explicit in most case about declaring these things /////////

var league; // a global containing the entire set of teams currently in existence

var teams;	// global object containing two teams, .left and .right
var players; // global list of all players

var firedplayers; // list of players who have been fired from league teams;

// initialize the play state with team possession and ballcarrier
var currdown;	// what down is it?
var possession;	// which team has possession of the ball?
var yardtarget;	// what's the yardmarker needed for a first down?
var ballcarrier; // what player currently has the ball?

// global object for tracking info for setting up new play
var nextdown = new Object();

// globals to keep track of team score stuff
var scores = new Object();

// game loop tracking globals
var state = "ready";
var timer = 0;

var lastframe = Date.now();	// time-between-frame tracking variable
var theloop; // = setInterval( gameloop, framelimit );


// relatively gender-neutral first names
var androgynous = "Adrian Alex Andy Ash Aubrey Avery Bailey Bernie Blaine Blair Bobbie Brett Brook Cameron Campbell Carey \
Carroll Casey Cass Cheyenne Chris Connie Courtney Dakota Dale Dana Darby Dee Devin Dusty Eddy Emery Finley Flannery Frankie \
Freddy Gabby Gayle Georgie Gerry Harley Harper Hayden Hollis Indiana Izzy Jacky Jamie Jay Jean Jerrie Jessie Joey Jojo Jordan \
Jules Kayden Kelly Kelsey Kendall Kennedy Kenzie Kim Kit Kris Lee Leslie Lindsay London Lou Mackenzie Madison Manny Marty Max \
Mel Micky Mo Morgan Nat Nicky Olly Parker Pat Payton Phoenix Quinn Reed Reese Riley Robby Robin Ronnie Rory Rowan Sage Sal Sam \
Sandy Sasha Shannon Shelby Shelly Sidney Skyler Stevie Tanner Taylor Temple Terry Tommie Tracy Val Vic Whitney";

// surname collections
var surnames = new Object();

surnames.US1000 = "Abbott Acevedo Acosta Adams Adkins Aguilar Aguirre Alexander Ali Allen Allison Alvarado Alvarez \
Andersen Anderson Andrade Andrews Anthony Archer Arellano Arias Armstrong Arnold Arroyo Ashley \
Atkins Atkinson Austin Avery Avila Ayala Ayers Bailey Baird Baker Baldwin Ball Ballard Banks Barajas \
Barber Barker Barnes Barnett Barr Barrera Barrett Barron Barry Bartlett Barton Bass Bates Bauer \
Bautista Baxter Bean Beard Beasley Beck Becker Bell Beltran Bender Benitez Benjamin Bennett Benson \
Bentley Benton Berg Berger Bernard Berry Best Bird Bishop Black Blackburn Blackwell Blair Blake \
Blanchard Blankenship Blevins Bolton Bond Bonilla Booker Boone Booth Bowen Bowers Bowman Boyd Boyer \
Boyle Bradford Bradley Bradshaw Brady Branch Brandt Braun Bray Brennan Brewer Bridges Briggs Bright \
Brock Brooks Brown Browning Bruce Bryan Bryant Buchanan Buck Buckley Bullock Burch Burgess Burke \
Burnett Burns Burton Bush Butler Byrd Cabrera Cain Calderon Caldwell Calhoun Callahan Camacho \
Cameron Campbell Campos Cannon Cantrell Cantu Cardenas Carey Carlson Carney Carpenter Carr Carrillo \
Carroll Carson Carter Case Casey Castaneda Castillo Castro Cervantes Chambers Chan Chandler Chaney \
Chang Chapman Charles Chase Chavez Chen Cherry Choi Christensen Christian Chung Church Cisneros \
Clark Clarke Clay Clayton Clements Cline Cobb Cochran Coffey Cohen Cole Coleman Collier Collins \
Colon Combs Compton Conley Conner Conrad Contreras Conway Cook Cooke Cooley Cooper Copeland Cordova \
Cortez Costa Cowan Cox Craig Crane Crawford Crosby Cross Cruz Cuevas Cummings Cunningham Curry \
Curtis Dalton Daniel Daniels Daugherty Davenport David Davidson Davies Davila Davis Dawson Day Dean \
Decker Delacruz Deleon Delgado Dennis Diaz Dickerson Dickson Dillon Dixon Dodson Dominguez Donaldson \
Donovan Dorsey Dougherty Douglas Downs Doyle Drake Duarte Dudley Duffy Duke Duncan Dunlap Dunn Duran \
Durham Dyer Eaton Edwards Elliott Ellis Ellison English Erickson Escobar Esparza Espinoza Estes \
Estrada Evans Everett Ewing Farley Farmer Farrell Faulkner Ferguson Fernandez Ferrell Fields \
Figueroa Finley Fischer Fisher Fitzgerald Fitzpatrick Fleming Fletcher Flores Flowers Floyd Flynn \
Foley Forbes Ford Foster Fowler Fox Francis Franco Frank Franklin Frazier Frederick Freeman French \
Frey Friedman Fritz Frost Fry Frye Fuentes Fuller Gaines Gallagher Gallegos Galloway Galvan Gamble \
Garcia Gardner Garner Garrett Garrison Garza Gates Gay Gentry George Gibbs Gibson Gilbert Giles Gill \
Gillespie Gilmore Glass Glenn Glover Golden Gomez Gonzales Gonzalez Good Goodman Goodwin Gordon \
Gould Graham Grant Graves Gray Green Greene Greer Gregory Griffin Griffith Grimes Gross Guerra \
Guerrero Gutierrez Guzman Haas Hahn Hale Haley Hall Hamilton Hammond Hampton Hancock Haney Hanna \
Hansen Hanson Hardin Harding Hardy Harmon Harper Harrell Harrington Harris Harrison Hart Hartman \
Harvey Hatfield Hawkins Hayden Hayes Haynes Hays Heath Hebert Henderson Hendricks Hendrix Henry \
Hensley Henson Herman Hernandez Herrera Herring Hess Hester Hickman Hicks Higgins Hill Hines Hinton \
Ho Hobbs Hodge Hodges Hoffman Hogan Holden Holder Holland Holloway Holmes Holt Hood Hooper Hoover \
Hopkins Horn Horne Horton House Houston Howard Howe Howell Huang Hubbard Huber Hudson Huerta Huff \
Huffman Hughes Hull Humphrey Hunt Hunter Hurley Hurst Hutchinson Huynh Ibarra Ingram Irwin Jackson \
Jacobs Jacobson James Jarvis Jefferson Jenkins Jennings Jensen Jimenez Johns Johnson Johnston Jones \
Jordan Joseph Joyce Juarez Kaiser Kane Kaufman Keith Keller Kelley Kelly Kemp Kennedy Kent Kerr Key \
Khan Kidd Kim King Kirby Kirk Klein Kline Knapp Knight Knox Koch Kramer Krause Krueger Lam Lamb \
Lambert Landry Lane Lang Lara Larsen Larson Lawrence Lawson Le Leach Leblanc Lee Leon Leonard Lester \
Levine Levy Lewis Li Lin Lindsey Little Liu Livingston Lloyd Logan Long Lopez Love Lowe Lowery \
Lozano Lucas Lucero Luna Lutz Lynch Lynn Lyons Macdonald Macias Mack Madden Maddox Mahoney Maldonado \
Malone Mann Manning Marks Marquez Marsh Marshall Martin Martinez Mason Massey Mata Mathews Mathis \
Matthews Maxwell May Mayer Maynard Mayo Mays Mcbride Mccall Mccann Mccarthy Mccarty Mcclain Mcclure \
Mcconnell Mccormick Mccoy Mccullough Mcdaniel Mcdonald Mcdowell Mcfarland Mcgee Mcgrath Mcguire \
Mcintosh Mcintyre Mckay Mckee Mckenzie Mckinney Mcknight Mclaughlin Mclean Mcmahon Mcmillan Mcneil \
Mcpherson Meadows Medina Mejia Melendez Melton Mendez Mendoza Mercado Mercer Merritt Meyer Meyers \
Meza Michael Middleton Miles Miller Mills Miranda Mitchell Molina Monroe Montes Montgomery Montoya \
Moody Moon Mooney Moore Mora Morales Moran Moreno Morgan Morris Morrison Morrow Morse Morton Moses \
Mosley Moss Moyer Mueller Mullen Mullins Munoz Murillo Murphy Murray Myers Nash Navarro Neal Nelson \
Newman Newton Nguyen Nichols Nicholson Nielsen Nixon Noble Nolan Norman Norris Norton Novak Nunez \
Obrien Ochoa Oconnell Oconnor Odom Odonnell Oliver Olsen Olson Oneal Oneill Orozco Orr Ortega Ortiz \
Osborn Osborne Owen Owens Pace Pacheco Padilla Page Palmer Park Parker Parks Parrish Parsons Patel \
Patrick Patterson Patton Paul Payne Pearson Peck Pena Pennington Perez Perkins Perry Peters Petersen \
Peterson Petty Pham Phelps Phillips Pierce Pineda Pittman Pitts Pollard Ponce Poole Pope Porter \
Potter Potts Powell Powers Pratt Preston Price Prince Proctor Pruitt Pugh Quinn Ramirez Ramos Ramsey \
Randall Randolph Rangel Rasmussen Ray Raymond Reed Reese Reeves Reid Reilly Reyes Reynolds Rhodes \
Rice Rich Richard Richards Richardson Richmond Riddle Riggs Riley Rios Ritter Rivas Rivera Rivers \
Roach Robbins Roberson Roberts Robertson Robinson Robles Rocha Rodgers Rodriguez Rogers Rojas \
Rollins Roman Romero Rosales Rosario Rose Ross Roth Rowe Rowland Roy Rubio Ruiz Rush Russell Russo \
Ryan Salas Salazar Salinas Sampson Sanchez Sanders Sandoval Sanford Santana Santiago Santos Saunders \
Savage Sawyer Schaefer Schmidt Schmitt Schneider Schroeder Schultz Schwartz Scott Sellers Serrano \
Sexton Shaffer Shah Shannon Sharp Shaw Shea Shelton Shepard Shepherd Sheppard Sherman Shields Short \
Silva Simmons Simon Simpson Sims Singh Singleton Skinner Sloan Small Smith Snow Snyder Solis Solomon \
Sosa Soto Sparks Spears Spence Spencer Stafford Stanley Stanton Stark Steele Stein Stephens \
Stephenson Stevens Stevenson Stewart Stokes Stone Stout Strickland Strong Stuart Suarez Sullivan \
Summers Sutton Swanson Sweeney Tanner Tapia Tate Taylor Terrell Terry Thomas Thompson Thornton Todd \
Torres Townsend Tran Travis Trevino Trujillo Tucker Turner Tyler Underwood Valdez Valencia Valentine \
Valenzuela Vance Vang Vargas Vasquez Vaughan Vaughn Vazquez Vega Velasquez Velazquez Velez Villa \
Villanueva Villarreal Villegas Vincent Wade Wagner Walker Wall Wallace Waller Walls Walsh Walter \
Walters Walton Wang Ward Ware Warner Warren Washington Waters Watkins Watson Watts Weaver Webb Weber \
Webster Weeks Weiss Welch Wells Werner West Wheeler Whitaker White Whitehead Whitney Wiggins Wilcox \
Wiley Wilkerson Wilkins Wilkinson Williams Williamson Willis Wilson Winters Wise Wolf Wolfe Wong \
Wood Woodard Woods Woodward Wright Wu Wyatt Yang Yates Yoder York Young Yu Zamora Zavala Zhang \
Zimmerman Zuniga";
surnames.japan = "Sato Suzuki Takahashi Tanaka Watanabe Ito Yamamoto Nakamura Kobayashi Kato Yoshida Yamada Sasaki Yamaguchi \
Saito Matsumoto Inoue Kimura Hayashi Shimizu Yamazaki Mori Abe Ikeda Hashimoto Yamashita Ishikawa Nakajima Maeda Fujita \
Ogawa Goto Okada Hasegawa Murakami Kondo Ishii Saito Sakamoto Endo Aoki Fujii Nishimura Fukuda Ota Miura Fujiwara Okamoto Matsuda Nakagawa";
surnames.mexico = "Garcia Hernandez Gonzalez Lopez Rodriguez Perez Sanchez Ramirez Flores";
surnames.azerbaijan = "Mammadov Aliyev Hasanov Huseynov Guliyev Hajiev Rasulov Musayev Abbasov Babayev Valiyev Orujov Ismayilov Ibrahimov";
surnames.bangledesh = "Ahmed Ali Aktar Banerjee Bonik Byapari Boruya Bishwas Bhoumik Bosu Chakma Chokroborti Chottopadhyay Choudhuri \
Das Debnath Dewan Dey Dutta Gazi Hok Hasan Hussain Islam Kazi Khan Mahmud Mojumdar Marma Mina Mirza Mitra Mollah Muhammad Mukhopadhyay \
Munsi Patoyari Pal Rohoman Roy Saha Sorkar Sen Shekh Thakur Tripura Uddin Wazed";
surnames.china = "Wang Li Zhang Liu Chen Yang Huang Zhao Wu Zhou Xu Sun Ma Zhu Hu Guo He Gao Lin Luo";
surnames.india = "Patel Singh Kumar Das Kaur";
surnames.israel = "Cohen Levi Mizrachi Peretz Biton Dahan Avraham Friedman Malka Azoulay Katz Yosef David Omer Ohayon Hadad Gabai Ben-David \
Adrei Levin Tal Klein Khen Shapira Chazan Moshe Ashkenazi Ohana Segal Golan";
surnames.korea = "Kim Lee Park Choii Jeong Kang Cho Yoon Jang Lim Han Shin Seo Kwon Hwang Ahn Song Yoo Hong Jeon Ko Mun Yang Bae Baek Heo Sim Gwak Seong";
surnames.philippines = "Santos Reyes Cruz Bautista Ocampo del Rosario Gonzales Aquino Ramos Garcia Lopez dela Cruz Mendoza Pascual Castillo \
Villanueva Diaz Rivera Navarro Mercado Morales Fernandez Marquez Rodriguez Sanchez De Leon";
surnames.vietnam = "Nguyen Tran Le Pham Hoang Phan Vu Dang Bui Do Ho Ngo Duong";
surnames.costarica = "Mora Rodriguez Gonzalez Hernandez Morales Sanchez Ramirez Perez Calderon Gutierrez Rojas Salas Vargas Torres Segura \
Valverde Villalobos Araya Herrera Lopez Madrigal";
surnames.armenia = "Harutyunyan Sargsyan Khachatryan Grigoryan Sarkeesian";
surnames.austria = "Gruber Huber Bauer Wagner Müller Pichler Steiner Moser Mayer Hofer Leitner Berger Fuchs Eder Fischer Schmid Winkler \
Weber Schwarz Maier Schneider Reiter Mayr Schmidt Wimmer Egger Brunner Lang Baumgartner Auer";
surnames.belgium = "Peeters Janssens Maes Jacobs Mertens Willems Claes Goossens Wouters De Smet Dubois Lambert Dupont Martin Simon";
surnames.bosniak = "Alijagic Hodzic Hadzic Cengic Delic Demirovic Kovacevic";
surnames.serb = "Kovacevic Subotic Savic Popovic Jovanovic Petrovic Duric Babic";
surnames.bulgaria = "Dimitrov Dzhurov Petrov Ivanov Stoyanov Stefanov Boyanov Trifonov Tasev Metodiev";
surnames.denmark = "Jensen Nielsen Hansen Pedersen Andersen Christensen Larsen Sorensen Rasmussen Jorgensen Petersen Madsen Kristensen \
Olsen Thomsen Christiansen Poulsen Johansen Moller Knudsen";
surnames.estonia = "Tamm Saar Sepp Magi Kask Kukk Rebane Ilves Parn Koppel";
surnames.finland = "Korhonen Virtanen Makinen Nieminen Makela Hamalainen Laine Heikkinen Koskinen Jarvinen Lehtonen Lehtinen Saarinen Salminen \
Heinonen Niemi Heikkila Salonen Kinnunen Turunen Salo Laitinen Tuominen Rantanen Karjalainen Jokinen Mattila Savolainen Lahtinen Ahonen";
surnames.france = "Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent Lefebvre Michel Garcia David Bertrand Roux \
Vincent Fournier Morel Girard Andre Lefevre Mercier Dupont Lambert Bonnet Francois Martinez";
surnames.germany = "Mueller Schmidt Schneider Fischer Meyer Weber Schulz Wagner Becker Hoffmann";
surnames.greece = "Papadopoulos Vlahos Angelopoulos Nikolaidis Georgiou Petridis Athanasiadis Dimitriadis Papadakis Panagiotopoulos Papantoniou Antoniou";
surnames.hungary = "Nagy Horvath Kovacs Szabo Toth Varga Kiss Molnar Nemeth Farkas Balogh Papp Takacs Juhasz Lakatos Meszaros Olah Simon Racz Fekete";
surnames.ireland = "Murphy O'Kelly O'Sullivan Walsh Smith O'Brien O'Byrne O'Ryan O'Connor O'Neill O'Reilly Doyle McCarthy O'Gallagher O'Doherty \
Kennedy Lynch Murray O'Quinn O'Moore";
surnames.italy = "Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De Luca Costa Giordano Mancini \
Rizzo Lombardi Moretti Sante Ravelli";
surnames.kosovo = "Zogaj Gashi Krasniqi Morina Kelmendi Beqiri Jakupi Kastrati Avdiu Shala Ademi Sejdiu Hoxha";
surnames.latvia = "Berzins Kalnins Ozolins Jansons Ozols Liepins Krumins Balodis Eglitis Zarins Petersons Vitols Klavins Karklins Vanags";
surnames.lithuania = "Kazlauskas Petrauskas Jankauskas Stankevicius Vasiliauskas Zukauskiene Butkiene Paulauskiene Urboniene Kavaliauskiene";
surnames.malta = "Borg Camilleri Vella Farrugia Zammit Galea Micallef Grech Attard Spiteri";
surnames.netherlands = "De Jong Jansen De Vries Van den Berg Van Dijk Bakker Janssen Visser Smit Meijer De Boer Mulder De Groot Bos Vos Peters \
Hendriks Van Leeuwen Dekker Brouwer De Wit Dijkstra Smits De Graaf Van der Meer";
surnames.norway = "Hansen Johansen Olsen Larsen Andersen Pedersen Nilsen Kristiansen Jensen Karlsen Johnsen Pettersen Eriksen Berg \
Haugen Hagen Johannessen Andreassen Jacobsen Halvorsen";
surnames.poland = "Nowak Kowalski Wisniewski Wojcik Kowalczyk Kaminski Lewandowski Zielinski Szymanski Wozniak Dabrowski Kozlowski Jankowski \
Mazur Kwiatkowski Wojciechowski Krawczyk Kaczmarek Piotrowski Grabowski";
surnames.portugal = "Silva Santos Ferreira Pereira Oliveira Costa Rodrigues Martins Jesus Sousa Fernandes Goncalves Gomes Lopes Marques Alves \
Almeida Ribeiro Pinto Carvalho Teixeira Moreira Correia Mendes Nunes Soares Vieira Monteiro Cardoso Rocha";
surnames.romania = "Popa Popescu Pop Radu Dumitru Stan Stoica Gheorghe Matei Ciobanu";
surnames.russia = "Smirnov Ivanov Kuznetsov Popov Sokolov Lebedev Kozlov Novikov Morozov Petrov Volkov Solovyov Vasilyev Zaytsev Pavlov \
Semyonov Golubev Vinogradov Bogdanov Vorobyov";
surnames.slovakia = "Horvath Kovac Varga Toth Nagy Balaz Szabo Molnar Balog Lukac";
surnames.slovenia = "Novak Horvat Kovacic Krajnc Zupancic Potocnik Kovac Mlakar Kos Vidmar Golob Turk Bozic Kralj Korosec Zupan Bizjak Hribar Kotnik Kavcic";
surnames.spain = "Diaz Fernandez Gonzalez Rodriguez Lopez Martinez Sanchez Perez Martin Gomez Ruiz Hernandez Jimenez Diaz Alvarez Moreno Munoz Alonso";
surnames.sweden = "Andersson Johansson Karlsson Nilsson Eriksson Larsson Olsson Persson Svensson Gustafsson Pettersson Jonsson Jansson Hansson \
Bengtsson Jonsson Lindberg Jakobsson Magnusson Olofsson";
surnames.turkey = "Yilmaz Kaya Demir Sahin Celik Yildiz Yildirim Ozturk Aydın Ozdemir";
surnames.ukraine = "Melnyk Shevchenko Boyko Kovalenko Bondarenko Tkachenko Kovalchuk Kravchenko Oliynyk Shevchuk Koval Polishchuk Bondar Tkachuk \
Moroz Marchenko Lysenko Rudenko Savchenko Petrenko";
surnames.uk = "Smith Jones Taylor Brown Williams Wilson Johnson Davies Robinson Wright Thompson Evans Walker White Roberts Green Hall Wood Jackson Clarke";
surnames.argentina = "Fernandez Rodriguez Gonzalez Garcia Lopez Martinez Perez Alvarez Gomez Sanchez Diaz Vasquez Castro Romero \
Suarez Blanco Ruiz Alonso Torres Dominguez";
surnames.brazil = "Silva Santos Souza Oliveira Pereira Lima Carvalho Ferreira Rodrigues Almeida Costa Gomes Martins Araujo Melo Barbosa \
Ribeiro Alves Cardoso Schmitz";
surnames.chile = "Gonzalez Munoz Rojas Diaz Perez Soto Contreras Silva Martinez Sepulveda Morales Rodriguez Lopez Fuentes Hernandez Torres \
Araya Flores Espinoza Valenzuela";
surnames.colombia = "Rodriguez Gomez Gonzalez Martinez Garcia Lopez Hernandez Sanchez Ramirez Perez Diaz Munoz Rojas Moreno Jimenez";
surnames.paraguay = "Gonzalez Benitez Martinez Lopez Gimenez Vera Duarte Ramirez Villalba Fernandez Gomez Acosta Rojas Ortiz Caceres Rodriguez \
Ruiz Nunez Ayala Baez";
surnames.peru = "Quispe Flores Snchez Rodriguez Garcia Rojas Gonzalez Díaz Chavez Torres Ramirez Mendoza Ramos Lopez \
Castillo Espinoza Vasquez Huaman Perez Vargas";


var firstnames = androgynous.split(" ");
var lastnames = [];
for(var k in surnames) {
	lastnames = lastnames.concat(surnames[k].split(" "));
}


// utility function to neaten up generation of random integers 0 <= n < max
function intrand(max) {
	return(Math.floor(Math.random() * max));
}

var playcalls = []; // global list of recent play by play messages
// utility function, update the play by play array
function announce(str) {
	var maxcalls = 10000;
	playcalls.unshift(str);
	if(playcalls.length > maxcalls) {
		playcalls.pop();
	}
}

var finalscores = []
// update game final scores
function final(str) {
	var maxcalls = 10000;
	finalscores.unshift(str);
	if(finalscores.length > maxcalls) {
		finalscores.pop();
	}
}

// Not currently in use.
// given a genetic value and a gene length, encode a GATC string representing the gene
function genestring(val, size) {
	var code = ["G", "A", "T", "C"];
	var v = val;
	var out = "";
	for(var i = 0; i < size; i++) {
		var bit = v % 4; // get the ones place of the base-4 representation of this value
		out += code[bit];
		v = Math.floor(v / 4);
	}
	return out;
}

// given a player object, return a new player object that's a genetically similar mutation
function mutate_player(p, rate) {
 
	var mrate = rate; // the probability that any given gene will be replaced.

	// first, grab a random set of genes
	var newg = get_random_genes();
	// next, grab a new copy of player p's current genes
	var targetg = copy_genes(p.genes);
	// now we use a probability constant to switch some random number of the old genes out for the new ones
	for(var k in targetg) {
		if(Math.random() < mrate) {
	//		console.log("Replacing original gene " + k + "(" + targetg[k] + ") with new gene (" + newg[k] + ")");
			targetg[k] = newg[k];
		}
	}

	// and create and return a new player with those genes
	var newp = initialize_player(targetg);
	return newp;
}

// given two player objects, return a new player object that's a gentic combo of the two
function mate_player(p1, p2) {
	var targetg = copy_genes(p1.genes); // start with a copy of one player's genes
	for(var k in targetg) {
		if(Math.random() < 0.5) {
			// even chance that a given gene will be overridden by p2's allele instead
			targetg[k] = p2.genes[k];
		}
	}
	var newp = initialize_player(targetg);
	return newp;
}

// given a player object p, returns a newly created player object with identical genes
function clone_player(p) {
	var newp = initialize_player(copy_genes(p.genes));
	return newp;
}

// create a fresh copy of a given set of genes
//	at this writing, a gene sequence is a shallow list of integers, so this is simple enough
function copy_genes(genes) {
	var g = new Object();
	for(var key in genes) {
		g[key] = genes[key];
	}
	return g;
}

// return a collection of randomly generated player genes
function get_random_genes() {

	var g = new Object(); // a gene sequence

	/* an individual gene has:
		- .name : a text string for easy reference
		- .longname : a longer, more descriptive text label 
		- .val : an integer value representing some genetic trait e.g. leg length, pigment richness
		- .size : a representation of upper bound of .val where .size is n in (n^4 - 1)
		- .gatc : a string representation of val as a series of .size G, A, T, and C characters

		e.g for Trunk Width:

		var gene = new Object();
		gene.name = "trw";
		gene.longname = "trunk width"
		gene.val = (intrand(4) + 2) * 2;
		gene.size = 2;
		gene.gatc = genestring(gene.val, gene.size);

		then refer to gene as e.g. g[trw], value as g[trw].val, printing with .gatc; .size used here
			just for purpose of determining how long the string in .gatc is.

		But this provides no useful limit on actual values of .val; in this example, we can tell by
			looking at the math generating .val that it's meant to be a number between 4 and 10, 
			jumping up by intervals of 2, but nothing about the gene defintion otherwise enforces that,
			and so the question of what to do in cases of mutation or chromosomal exchange is left
			to be defined by those processes anyway.  So rewriting everything to this spec doesn't 
			really buy me much but does overcomplicate a lot of stuff and mean a lot more code. Gonna
			punt for now and revisit.

	*/

	/* Defining a gene's range of expressible values:

		One possible approach is to say every gene's possible value is expressible as a random number
			generation formula of the form 

				((intrand(a) + b) * c) + d

			so that generating that value could work as a call to a standard function with gene-sepecific
			values for a, b, c, d; any time we need to mutate that gene, we can do so by just calling

				newgene(g.a, g.b, g.c, g.d)

			and know that we'll get back a value in the acceptable range of values for that gene without
			having to duplicate code in various functions.

		Downside is this gets in the way of possible idiosyncratic genes that might otherwise benefit
			from some other generation process, but right now such genes exist in the code or in my
			rough sketches for future genetic tidbits, so probably not an issue.	

		Other downside is it makes those value generation strings goddam opaque.
	*/

	/* Synthesizing two previous ideas:

		- .name : a text string for easy reference
		- .longname : a longer, more descriptive text label 
		- .val : an integer value representing some genetic trait e.g. leg length, pigment richness
		- .a, .b, .c, .d : coefficients for generation function .val = ((intrand(a) + b) * c) + d
			(or e.g. .k = [a, b, c, d] to keep things a little cleaner)
		- .size : a representation of upper bound of .val where .size is n in (n^4 - 1) large
			enough to accomodate max .val value (((a-1) + b) * c) + d, derived automatically
		- .gatc : a string representation of .val as a series of .size G, A, T, and C characters

		New values for .val can be generated via a-d in a call to newgene(a, b, c, d) and be gauranteed
			to be valid; .size can be calculated automatically from the largest-case calculation for a-d; 
			this still doesn't help with chromosomal recombination which could in theory produce invalid
			values for .val as a result of mashing a couple sections of a bitstring together, though.
			But a weaker form of sexual reproduction that just grabs whole individual genes would probably work.

		Another challenge that remains, though: gene expression that depends on another gene.  Currently
			the maximum combined strength of legs needs to be smaller than the trunk width for a player;
			if a new offspring or clone player gets trunk width or leg width genes that violate that
			assumption, then there's an issue.  Possible approaches:
			
			- duplicate the per-gene bounds-checking done in this function in any other gene-manip
				functions

			- find a way to generalize that bounds-checking somehow (not clear how this'd work)

			- make the sanity-check function a member of the gene itself, and call it after generating
				modified genetic value to allow nudging/regeneration

			- just don't set up these genetic dependencies, e.g. accommodate legs that are bigger combined 
				than the trunk of the player and just say that's alright.  (Currently the only reason that's
				a constraint is the assumptions of a silly avatar drawing function, so, why burden myself
				with that?  Just tweak the damn drawing function instead.)
	*/

	/* A simpler idea:

		Every gene is a 2-bit value from 0-3.  Every gene can be validly any of those four values.  Traits
		that depend on more than one gene for phenotypical expression can just do whatever math and validation
		they need to do using the genes they use, and the genes don't have to "worry" about whether they
		are okay based on what the value of other genes are.

		0-3 maps to GATC, making encoding/printing/reading/decoding of genes a cinch.

		This means more raw genes vs. the previous idea of arbitrarily large genes, but...who cares?  A pair
		of genes instead of one gene is totally fine.  AND it totally simplifies the idea of mutating portions
		of some trait-bearing gene, because you're literally just outright mutating a given single-letter gene.

	*/

	// TRUNK
	//  player's torso, major source of body mass
	g.G_trunkwidth = (intrand(4) + 2) * 2;
//	g.G_trunkwidth = intrand(8) + 4; // but what if this instead? non-even values mess with...drawing routines?
	g.G_trunkheight = intrand(8) + 2;

	// LEGS
	// 	summed leg length drives running speed; leg length asymmetry drives turning speed
	g.G_legleftlength = intrand(8) + 1;
	g.G_legrightlength = intrand(8) + 1;
	g.G_legleftstrength = intrand(3) + 1;
	g.G_legrightstrength = intrand(3) + 1;

	// lets insure that legs aren't as wide combined as trunk
	while(g.G_legleftstrength + g.G_legrightstrength > g.G_trunkwidth - 1) {
		if(g.G_legleftstrength == 1) {
			// left leg already minimum size, reduce right instead
			g.G_legrightstrength--;
		}
		else if(g.G_legrightstrength == 1) {
			// ditto for right
			g.G_legleftstrength--;
		}
		else {
			// both can stand reducing, pick one at random
			if(Math.random() > 0.5) {
				g.G_legleftstrength -= 1;
			}
			else {
				g.G_legrightstrength -= 1;
			}
		}
	}

	// ARMS
	//  arm length contributes to turning as well, and might amplify or mitigate leg turning
	g.G_armleftlength = intrand(8) + 1;
	g.G_armrightlength = intrand(8) + 1;
	g.G_armleftstrength = intrand(3) + 1;
	g.G_armrightstrength = intrand(3) + 1;

	// BRAIN
	//	magnetic orientation in the brain dictates heading at the beginning of a play, like
	//		with birds or whales or whatever you want to think to make this work. 
	g.G_brainheadinggross = intrand(8);
	g.G_brainheadingfine = intrand(8);

	// skin color
	g.G_pigmentR = intrand(150) + 90;
	g.G_pigmentG = intrand(90) + 60;
	g.G_pigmentB = intrand(40) + 20;

	return g;
}

// experiment: print out a player's dna as a GATC sequence
function print_genome(p) {
	var chem = ["G", "A", "T", "C"];
	var g = p.genes;
	var DNA = "";
	for(var k in g) {
		var str = "";
		var bits = g[k];
		while(bits > 0) {
			var b = bits % 4;
			bits = Math.floor(bits / 4);
			str += chem[b];
		}
		DNA += str + " ";
	} 
	console.log(p.team.name + " #" + p.number + " " + p.firstname + ". " + p.lastname + " :: " + DNA);
}

// create a new random player
function initialize_random_player() {
	var g = get_random_genes();
	var newp = initialize_player(g);
	return newp;
}

// create a new player with supplied gene sequence for either the left or the right team
function initialize_player(genes) {
	var p = new Object();
	p.id;	// non-cosmetic index into player's team's roster for player
	p.number; // cosmetic player number
	p.hired;	// game number at which player joined their team
	p.fired;	// game number after which player was fired from their team
	p.team = new Object(); // any reason to actaully define this yet?
	p.firstname = firstnames[Math.floor(Math.random() * firstnames.length)];
	p.lastname = lastnames[Math.floor(Math.random() * lastnames.length)];

	// some genetic scaling factors to translate raw gene number values to appropriate game values
	var scale_legspeed = 0.15;
	var scale_legturn = 0.015;
	var scale_legmass = 1;

	var scale_armturn = 0.01;
	var scale_armmass = 0.7;

	var scale_trunkmass = 1.5;

	var scale_brainheading = 64 / (2 * Math.PI); // clamp range from 0-63 down to approx 0-2pi

	// var scale_playersize = 0.4; // exponent in pow()
	var scale_playersize = 0.5 * Math.pow(0.95, teamsize); 
	var masspenalty = 0.003;
	// generate a series of allele values for player's DNA

	// a gene sequence
	p.genes = genes; // fetch a random set of genes for the player
		// TODO -- or should that be a deep copy? are we vouching for the genes passed in being new/distinct
		//	and not the property of some existing other player?
	var g = p.genes; // temporary utility reference for readability

	//// Process the gene sequence into actual phenotypical vital stats
	// trunk-specific factors
	p.trunkmass = g.G_trunkwidth * g.G_trunkheight * scale_trunkmass;

	// calculate leg-specific factors for speed and turning
	p.legspeed = ( ((g.G_legleftlength + g.G_legrightlength) / 2) + ((g.G_legleftstrength + g.G_legrightstrength) / 2) ) * scale_legspeed;
	p.legturn = (g.G_legleftlength - g.G_legrightlength) * scale_legturn;
	p.legmass = ((g.G_legleftlength * g.G_legleftstrength) + (g.G_legrightlength * g.G_legrightstrength)) * scale_legmass;

	// arm-specific factors
	p.armspeed = 0; // pumping arms has no effect on travel speed, eh?
	p.armturn = (g.G_armleftlength - g.G_armrightlength) * scale_armturn;
	p.armmass = ((g.G_armleftlength * g.G_armleftstrength) + (g.G_armrightlength * g.G_armrightstrength)) * scale_armmass;

	p.brainheading = ((g.G_brainheadinggross * 8) + (g.G_brainheadingfine)) * scale_brainheading;

	p.skincolor = "rgba(" + g.G_pigmentR + "," + g.G_pigmentG + "," + g.G_pigmentB + ",1)";

	// calculate holistic stats based on various contributing factors
	p.mass = p.legmass + p.armmass + p.trunkmass;	// how much the player weighs
	p.massdrag = p.mass * masspenalty;	// how much speed they lose on account of their weight

	p.speed = p.legspeed - p.massdrag;
	p.turn = p.legturn + p.armturn;
	p.size = Math.pow(p.mass, scale_playersize);
	p.heading = p.brainheading;

	p.x; // x position on field
	p.y; // y position on field

	p.t; // current heading in radians
	p.v; // current velocity
	p.vt; // current rotational velocity

	p.scores = new Object(); // collection of per-player scoring stats
	p.scores.points = 0;
	p.scores.yards = 0;
	p.scores.tackles = 0;
	p.scores.sacks = 0;
	p.scores.touchdowns = 0;
	p.scores.safeties = 0;

	p.played = 0;

	return p;
}

// reset a player's coords and heading for a new play starting from the line of scrimmage
//  TODO: get some of the literal constants in here abstracted to named variables
function reset_player(p) {
	p.v = p.speed;	// at the moment this isn't really necessary, since v and vt don't change...
	p.vt = p.turn;	// ...but good to be explicit about it.

	if(p.team == teams.left) {
		p.x = los - 10 - Math.random() * 5;
		p.y = 7 + Math.random() * 46;
		p.t = p.heading;
	}
	else {
		p.x = los + 10 + Math.random() * 5;
		p.y = 7 + Math.random() * 46;
		p.t = p.heading + Math.PI; // players on the right-side team need to rotate their heading a half circle
	}
}

// given a player object, look at its scoring statistics and produce a fitness score, where
//	higher indicates better performance
function get_fitness(p) {

	/* 	Fitness is basically an arbitrary metric: there are various things that seem obviously good,
			and other things that seem obviously bad, and then other bits and pieces that are more subtle,
			and whatever goes into this analysis with whatever weighting gives us a magic number.

		Yardage is probably our simplest metric: consistent gains turn into first downs and TDs if
			you're the ballcarrier, and forced safeties by the other team if you're on defense.

		Touchdowns seems like an obvious metric but may essentially tell us nothing that yardage doesn't -- you
			probably aren't getting TDs unless you're consistently getting positive yardage.  So counting
			yards *and* points might be pointless doubling up.  But how to be sure?

		Tackles are probably good, though with idiotic circles, a tackle may actually
			be stopping an opposing qb in the foreward-most section of their doomed circle. It does 
			at least mean you're not running off away from the play entirely, though, and it may mean
			you're consistently stopping forward progress.

		Sacks are definitely good: you stopped the play on the opponent's side of the line of scrimmage,
			which means (a) you are pushing toward the endzone, and (b) you are costing them yardage
			and so helping prevent first downs and earning your team a change of possession, maybe forcing
			a safety.

		Safety points are another "is this doubling up" dilemma: sack in the endzone is definitely a good
			thing, but is it actaully a better sack performance than a non-safety, or just the same
			metric but you were lucky about opponent position?

		Another thing that could be considered but isn't implemented at this writing: time with the ball.  Each
			player gets zero or more seconds (and zero or more downs) as qb, so getting 100 yards in a larger
			span of time may be worth less than doing so really quickly, if you consider how that performance
			would extrapolate to a longer playing time.

	*/

	var w_yards = 1;
	var w_sacks = 10;
	var w_tackles = 3;
	var w_touchdowns = 0;
	var w_safeties = 0;
	var w_points = 0;

	// this is a terrible way to do this, yanking every call for a value that rarely changes; we should just 
	//	update these one in game loop, or, maybe better, only on update via some onchange-driven function call 
	//	that then itself updates the sliderval value on the page.
	w_yards = $("#pyards").val(); 	
	w_sacks = $("#psacks").val();
	w_tackles = $("#ptackles").val();
	w_touchdowns = $("#ptouchdowns").val();
	w_safeties = $("#psafeties").val();
	w_points = $("#ppoints").val();

	var fitness = 0;
	fitness += p.scores.yards * w_yards;	// positive yardage as ballcarrier is good, negative is bad
	fitness += p.scores.sacks * w_sacks;	// a sack is worth a lot on defense; you stopped them AND cost them yards
	fitness += p.scores.tackles * w_tackles; // a tackle is decent defense but not accomplishing as much as a sack
	fitness += p.scores.touchdowns * w_touchdowns;
	fitness += p.scores.safeties * w_safeties;
	fitness += p.scores.points * w_points;

	return fitness;
}

var rosterview = "players"; // global for tracking what kind of info to show on canvas
function toggle_view() {
	if(rosterview == "players") {
		rosterview = "stats";
	}
	else {
		rosterview = "players";
	}
}

var prevcanvaswidth = 0; // for tracking canvas resizes

// parent drawing function that calls all the other draw functions in proper order
function draw_canvas() {

	/* We want to draw crisply and proportionally to whatever the current canvas size is, so each frame we
		check to see if the canvas size has changed; if not, we just continue as before, but if so, we
		resize the context's model of the canvas size and update our scaling factor.

		It would make as much or more sense to handle this through some sort of browser resize event hook instead
		of manually checking it here, probably, but this works and I'm lazy and so here we are.
	*/

	var cw = $("#main").width();
	if(prevcanvaswidth != cw) {
		context.canvas.width = cw;
		context.canvas.height = cw;

		canvasscale = cw/world.w;
		prevcanvaswidth = cw;
	}

	context.save();
	context.scale(canvasscale, canvasscale); // scale up to whatever our canvas sizing should be
	
	context.fillStyle = "#000000";
	context.fillRect(0, 0, world.w, world.h);

	context.fillStyle = "#eeeeee"; // debugging contrast
	context.fillRect(1, 1, world.w - 2, world.h - 2);

	draw_field();
	draw_players(players);

	context.save();	// and compensate for having written these non-field bits for scale * 5 canvas coordinates
	context.scale(0.2, 0.2)

	if(rosterview == "players") {
		draw_rosters();
	}
	else if(rosterview == "stats") {
		draw_roster_stats();
	}
	else {
		console.log("Unknown rosterview: " + rosterview);
	}
	draw_WLT();
	draw_readout();
	draw_featured_player(ballcarrier);
	context.restore();

	context.restore();
	
}

var statsview = "league";
// call a bunch of functions that print text to divs on the page
function print_stats() {

	if(statsview == "playbyplay") {
		print_playcall();
	}
	else if(statsview == "finalscores") {
		print_final();
	}
	else {
		print_playerstats(statsview);
	}
}

function print_playcall() {
	var out = "<h2>Play by play</h2>";	
	for(var i = 0; i < playcalls.length; i++) {
		out += playcalls[i] + "<br>";
	}
	$("#playerstats").html(out);
}

// chuck this out to an html div
function print_final() {
	var out = "<h2>Final scores</h2>";
	for(var i = 0; i < finalscores.length; i++) {
		out += finalscores[i] + "<br>";
	}
	$("#playerstats").html(out);
}

// find out the players fitness values averaged against total games played
function get_value(p) {
	var value = 0;
	if(p.played > 0) {
		value = (Math.floor( (get_fitness(p) / p.played) * 10)) / 10;
	}
	return value;
}

// draw brief season records for current teams
function draw_WLT() {
	var x = 250;
	var y = 380;

	var cl1 = teams.left.color;
	var cl2 = teams.left.color2;
	var cr1 = teams.right.color;
	var cr2 = teams.right.color2;

	context.font = "15px Courier";
	context.fillStyle = "#444444";
	context.fillText("Team", x, y);
	context.fillText("Won", x + 80, y);
	context.fillText("Lost", x + 120, y);
	context.fillText("Tied", x + 160, y);

	context.fillStyle = cl1;
	context.fillText(teams.left.name, x, y + 20);
	context.fillText(teams.left.won, x + 80, y + 20);
	context.fillText(teams.left.lost, x + 120, y + 20);
	context.fillText(teams.left.tied, x + 160, y + 20);

	context.fillStyle = cr1;
	context.fillText(teams.right.name, x, y + 40);
	context.fillText(teams.right.won, x + 80, y + 40);
	context.fillText(teams.right.lost, x + 120, y + 40);
	context.fillText(teams.right.tied, x + 160, y + 40);
}

// draw detailed stats of players
function draw_roster_stats() {
	// player stats
	var x = 400;
	var y = 500;

	context.fillStyle = "#444444";
	context.font = "14px Courier";
	context.fillText("pts", x, y);
	context.fillText("yds", x + 50, y);
	context.fillText("TDs", x + 100, y);
	context.fillText("Saf", x + 150, y);
	context.fillText("tak", x + 200, y);
	context.fillText("sak", x + 250, y);
	context.fillText("Value", x + 300, y);
	var tm = [teams.left, teams.right];
	for(var k = 0; k < tm.length; k++) {
		for(var i = 0; i < tm[k].roster.length; i++) {
			var yoff = y + 20 + (k * tm[0].roster.length * 13) + (k * 10) + (13 * i);
			var p = tm[k].roster[i];
			context.font = "13px Courier";
			context.fillStyle = p.team.color;
			context.fillText("#" + p.number + " " + p.lastname, x - 100, yoff);

			context.fillText(p.scores.points, x, yoff);
			context.fillText(p.scores.yards, x + 50, yoff);
			context.fillText(p.scores.touchdowns, x + 100, yoff);
			context.fillText(p.scores.safeties, x + 150, yoff);
			context.fillText(p.scores.tackles, x + 200, yoff);
			context.fillText(p.scores.sacks, x + 250, yoff);
			context.fillText(get_value(p), x + 300, yoff);

			if(p == ballcarrier) {
				context.fillText("<>", x - 120, yoff);
				context.drawImage(ballsmallimg, x - 123, yoff - 10);
			}

			if(i % 2) {
				draw_player_avatar(p, x - 140, yoff - 13, 1);
			}
			else {
				draw_player_avatar(p, x - 160, yoff - 13, 1);
			}
		}
	}
}

// draw little avatars and minimal stats for each team's players
function draw_rosters() {
	context.fillStyle = "#888888";
	// player portraits
	var tm = [teams.left, teams.right];
	for(var k = 0; k < tm.length; k++) {
		for(var i = 0; i < tm[k].roster.length; i++) {
			var xoff = 300 + (i * 55);
			var yoff = 480 + k*120;
			var p = tm[k].roster[i];

			draw_player_avatar(p, xoff, yoff, 3);

			context.font = "24px Courier";
			context.fillStyle = p.team.color;
			context.fillText(p.number, xoff + 10, yoff + 75);

			context.font = "14px Courier";
			context.fillStyle = p.team.color;
			context.fillText(get_value(p), xoff, yoff + 95);

			if(p == ballcarrier) {
				context.drawImage(ballsmallimg, xoff - 3, yoff + 30);
			}
		}
	}
}

// draw an actual stadium-style summary scoreboard
function draw_readout() {
	var x = 530;
	var y = 360;

	var foff = 18; // font offset constant since fonts draw up from y position baseline

	context.fillStyle = "#333333";
	context.fillRect(x - 10, y - 10, 230, 110);
	context.fillStyle = "#ffffff";
	context.fillRect(x - 8, y - 8, 226, 106);
	context.fillStyle = "#333333";
	context.fillRect(x - 5, y - 5, 220, 100);

	context.font = "20px Courier";

	context.fillStyle = teams.left.color2;
	context.fillRect(x, y + 2, 40, 18);
	context.fillStyle = teams.left.color;
	context.fillText(teams.left.name3, x + 1, y + foff);

	context.fillStyle = teams.right.color2;
	context.fillRect(x + 80, y + 2, 40, 18);
	context.fillStyle = teams.right.color;
	context.fillText(teams.right.name3, x + 80 + 1, y + foff);

	context.font = "14px Courier";

	context.fillStyle = "#dddddd";
	context.fillText("vs", x + 50, y + foff);
	context.fillText("DOWN", x + 10, y + 50 + foff);
	context.fillText("TO GO", x + 70, y + 50 + foff);

	context.fillText("GAME", x + 157, y + foff);
	context.fillText("PLAY", x + 157, y + 50 + foff);

	context.font = "20px Courier";
	context.fillStyle = "#cccc00";

	var ls = teams.left.scores.points;
	var rs = teams.right.scores.points;
	var lsoff = 0;
	var rsoff = 0;
	// nudge score digits
	if(ls < 10) { lsoff = 14; }
	else if(ls < 100) { lsoff = 7; }
	if(rs < 10) { rsoff = 14; }
	else if(rs < 100) { rsoff = 7; }

	context.fillText(ls, x + lsoff, y + 20 + foff);
	context.fillText(rs, x + rsoff + 80, y + 20 + foff);

	var togo = Math.abs(yardtarget - los);
	var tgoff = 0;
	if(togo < 10) { tgoff = 14; }
	else if(togo < 100) { tgoff = 7; }
	context.fillText(currdown, x + 24, y + 70 + foff);
	context.fillText(Math.abs(yardtarget - los), x + tgoff + 73, y + 70 + foff);

	context.fillText(pretty_time(gameclock), x + 150, y + 20 + foff);
	context.fillText(pretty_time(playclock), x + 150, y + 70 + foff);

	context.font = "14px Courier"
	if(possession == teams.left) {
		context.fillText("<>", x + 40, y + 30 + foff);
	}
	else {
		context.fillText("<>", x + 64, y + 30 + foff);
	}

}

// TODO revisit/expand the descriptions for each category
// highlight details on a given player
function draw_featured_player(p) {
	var xoff = 30;
	var yoff = 350;

	draw_player_avatar(p, xoff + 50, yoff + 50, 8);

	context.font = "20px Courier";
	context.fillStyle = "#000000";
	context.fillText("Current QB", xoff, yoff + 220);

	context.font = "15px Courier";
	context.fillStyle = p.team.color;
	context.fillText(p.team.name + " #" + p.number, xoff, yoff + 240);
	context.fillText(p.firstname + " " + p.lastname, xoff, yoff + 260);

	var sp = "";
	if(p.speed > 0.8) { sp = "SPRINT"; }
	else if(p.speed > 0.7) { sp = "RUN"; }
	else if(p.speed > 0.6) { sp = "JOG"; }
	else if(p.speed > 0.5) { sp = "MOSEY"; }
	else { sp = "CRAWL"; }
	context.fillText("Speed:   " + sp, xoff, yoff + 280);

	var tu = "";
	if(Math.abs(p.turn) > 0.09) { tu = "DRUNK"; }
	else if(Math.abs(p.turn) > 0.06) { tu = "UNSTEADY"; }
	else if(Math.abs(p.turn) > 0.03) { tu = "MIDDLING"; }
	else { tu = "TRUE"; }
	context.fillText("Balance: " + tu, xoff, yoff + 300);
		
	var aim = "";
	var h = p.heading;		// value in radians 
							//	(note -- doesn't need reflecting for right-siders, we do that with derived p.t mid-game)
	h = (h + Math.PI) % (Math.PI * 2) ; 	// rotate by pi, where 0/2p was original sweet spot and now pi is, 
											// then clamp that to 0-2pi radians
	h = Math.abs(Math.PI - h); 	// and find out how far off from sweet spot of pi we are
	if(h < Math.PI / 9) { aim = "PERFECT"}
	if(h < Math.PI / 6) { aim = "SHARP"; }
	else if(h < Math.PI / 4) { aim = "LUCID"; }
	else if(h < Math.PI / 2) { aim = "BALLPARK"; }
	else if(h < Math.PI / 1.5) { aim = "LOST"; }
	else { aim = "HOPELESS"; }
	context.fillText("Aim:     " + aim, xoff, yoff + 320);

	context.fillText("Value:   " + get_value(p), xoff, yoff + 340);

}

function change_stats(type) {
	statsview = type;
	print_stats();
}

function print_playerstats(scope) {

	var out = "";

	var tm; // our team list
	if(scope == "game") {
		// just the two teams in the current game
		tm = [teams.left, teams.right];
		out = "<h2>Current game</h2>"
	}
	else if(scope == "league") {
		// all the teams in the league
		tm = league;		
		out = "<h2>Current league</h2>"
	}
	else if(scope == "retired") {
		var tempteam = new Object();
		tempteam.roster = firedplayers;
		tm = [tempteam];
		out = "<h2>Retired players</h2>";
	}
	else {
		console.log("bad scope in print_playerstats:" + scope);
		return;
	}

	var cols = ["team", "player", "pts", "yds", "TD", "Saf", "tak", "sak", "Value", "hired", "fired"];
	out += "<table>\n<tr>"
	for(var i = 0; i < cols.length; i++) {
		out += "<th>" + cols[i] + "</th>\n";
	}
	out += "</tr>\n";

	if(scope == "retired" && tm[0].roster.length == 0) {
		out += "(no players have been fired yet)<br><br>";
	}

	for(var k = 0; k < tm.length; k++) {
		for(var i = 0; i < tm[k].roster.length; i++) {
			var p = tm[k].roster[i];
			out += "<tr>\n";
			out += "<td bgcolor='" + p.team.color2 + "'><font color='" + p.team.color + "'>" + p.team.name + "</font></td>\n"; 
			out += "<td>#" + p.number + " " + p.firstname + " " + p.lastname + "</td>\n";
			out += "<td>" + p.scores.points + "</td>\n";
			out += "<td>" + p.scores.yards + "</td>\n";
			out += "<td>" + p.scores.touchdowns + "</td>\n";
			out += "<td>" + p.scores.safeties + "</td>\n";
			out += "<td>" + p.scores.tackles + "</td>\n";
			out += "<td>" + p.scores.sacks + "</td>\n";
			out += "<td>" + get_value(p) + "</td>\n";
			out += "<td>" + p.hired + "</td>\n";
			out += "<td>" + p.fired + "</td>\n";

			out += "</tr>\n";
		}
		out += "<tr><td> </td></tr>\n";
	}
	out += "</table>\n";
	$("#playerstats").html(out);
}

// given a value s in seconds, return a formatted mm:ss string
// 	Note: handles negative values poorly, more than 59 minutes naively
function pretty_time(s) {
	var min = 0;
	var sec = Math.ceil(s);
	while(sec >= 60) {
		min++;
		sec -= 60;
	}
	if(sec < 10) {
		sec = "0" + sec;
	}
	return(min + ":" + sec);
}

var faceimg = new Image();
faceimg.src = "portraits/mockup.png";
// TODO: revisit the way this offsets player based on height, and consider handling player avatar
//	bounding box width/height stuff as a player attribute instead of calculating stuff on the fly?
// Draw a player based on genes, coords, and a scaling factor
function draw_player_avatar(p, x, y, sc) {

	var scale = sc;

	var g = p.genes; 	// utility reference

	var trunkw = g.G_trunkwidth * scale;
	var trunkh = g.G_trunkheight * scale;

	var larmw = g.G_armleftstrength * scale;
	var larmh = g.G_armleftlength * scale;
	var rarmw = g.G_armrightstrength * scale;
	var rarmh = g.G_armrightlength * scale;

	var llegw = g.G_legleftstrength * scale;
	var llegh = g.G_legleftlength * scale;
	var rlegw = g.G_legrightstrength * scale;
	var rlegh = g.G_legrightlength * scale;

	var lsockh = llegh / 2;
	var rsockh = rlegh / 2;

	var headw = 4 * scale;
	var headh = 5 * scale;
	var neckx = (trunkw / 2) - (headw / 2);

	var ox = x;	// screen offsets
	var oy = y;
	

	var longleg = llegh;
	if(rlegh > llegh) {
		longleg = rlegh;
	}
	var hadjust = (22 * scale) - (headh + trunkh + longleg);
	oy += hadjust; 

	var wadjust = (16 * scale) - (larmw + rarmw + trunkw);
	ox += wadjust / 2; 

	var c1 = p.team.color;
	var c2 = p.team.color2;
	if(p.team == teams.right) {
		var swap = c1;
		c1 = c2;
		c2 = swap;
	}

	// trunk
	context.fillStyle = c1;
	context.fillRect(ox, oy, trunkw, trunkh);

	// left arm
	context.fillStyle = c1;
	context.fillRect(ox - larmw - scale, oy, larmw, larmh);
	context.fillStyle = p.skincolor;
	context.fillRect(ox - larmw - scale, oy + larmh, larmw, scale);

	// right arm
	context.fillStyle = c1;
	context.fillRect(ox + trunkw + scale, oy, rarmw, rarmh);
	context.fillStyle = p.skincolor;
	context.fillRect(ox + trunkw + scale, oy + rarmh, rarmw, scale);

	// shoulders
	context.fillStyle = c1;
	context.fillRect(ox - larmw, oy - scale, larmw + trunkw + rarmw, scale);

	// head and neck
	context.fillStyle = p.skincolor;
	context.fillRect(ox + neckx, oy - headh - scale, headw, headh);
	context.fillRect(ox + neckx + scale, oy - scale, scale*2, scale);

/*	///// experimental face stuff
	context.save();
	context.translate(ox + neckx - scale - 9, oy - headh - 12);
	context.scale(0.5,0.5);
	context.drawImage(faceimg, 0, 0);
	context.restore();
*/

	// and a helmet
	context.fillStyle = c2;
	context.fillRect(ox + neckx - scale, oy - headh, scale, scale * 2);
	context.fillRect(ox + neckx + headw, oy - headh, scale, scale * 2);
	context.fillRect(ox + neckx, oy - headh - scale, headw, scale * 2);
	context.fillStyle = "#000000";
	context.fillRect(ox + neckx - scale, oy - headh + scale*2, headw + scale*2, scale);

	// gut/belt/hips/whatever
	context.fillStyle = c2;
	context.fillRect(ox, oy + trunkh, trunkw, scale);

	// left leg
	context.fillStyle = c2;
	context.fillRect(ox, oy + trunkh + scale, llegw, llegh);
	context.fillStyle = c1;
	context.fillRect(ox, oy + trunkh + scale + lsockh, llegw, lsockh);

	// right leg
	context.fillStyle = c2;
	context.fillRect(ox + trunkw - rlegw, oy + trunkh + scale, rlegw, rlegh);
	context.fillStyle = c1;
	context.fillRect(ox + trunkw - rlegw, oy + trunkh + scale + rsockh, rlegw, rsockh);

	// left shoe
	context.fillStyle = "#000000";
	context.fillRect(ox - scale, oy + trunkh + scale + llegh, llegw + scale, scale);

	// right shoe
	context.fillStyle = "#000000";
	context.fillRect(ox + trunkw - rlegw, oy + trunkh + scale + rlegh, rlegw + scale, scale);

	

}

// draw all the players
function draw_players(players) {
	for(var i = 0; i < players.length; i++) {
		draw_player(players[i]);
	}
}

// football image resource
var ballimg = new Image();
ballimg.src = "ball_large.png"; 
var ballsmallimg = new Image();
ballsmallimg.src = "ball.png";

// draw up a football player!
function draw_player(p) {

	var c1 = p.team.color;
	var c2 = p.team.color2;
	var circle = "#000000";
	if(p.team == teams.right) {
		var swap = c1;
		c1 = c2;
		c2 = swap;
	}

//* circles
	context.beginPath();
    context.arc(field.x + p.x, field.y + p.y, p.size, 0, 2 * Math.PI, false);
    context.fillStyle = c1;
	context.fill();
	context.lineWidth = 0.6;
	context.strokeStyle = circle;

	context.stroke();
	context.beginPath();
    context.arc(field.x + p.x, field.y + p.y, p.size - 0.6, 0, 2 * Math.PI, false);	
	context.lineWidth = 0.6;
	context.strokeStyle = c2;
	context.stroke();

// directional indicator
	context.beginPath();
	context.moveTo( (field.x + p.x) + (Math.cos(p.t) * p.size * 0.6), (field.y + p.y) - (Math.sin(p.t) * p.size* 0.6) );
	context.lineTo( (field.x + p.x) + (Math.cos(p.t) * p.size), (field.y + p.y) - (Math.sin(p.t) * p.size) );
	context.lineWidth = 0.4;
	context.strokeStyle = c2;
	context.stroke();
//*/	

/* alternate avatar sprite experiment
	context.save();
	context.translate(field.x + p.x, field.y + p.y );
	if(p.team == teams.left) {
		context.rotate((p.t % (Math.PI * 2) * -1));
	}
	else {
		context.rotate(((p.t + Math.PI) % (Math.PI * 2) * -1));
	}
	draw_player_avatar(p, -p.size, -p.size, 0.8);
	context.restore();
//*/

	// player number
	context.fillStyle = c2;
	/* TODO: This is a decent idea worth pursuing, but needs a little more serious love to make work
		with things like teamsize and scale-based x offset printed number.
	var fontsize = p.size * 1.7;
	context.font = fontsize + "px Courier";
	*/
	context.font = "7px Courier";
	context.fillText(p.number, (field.x + p.x) - 2, (field.y + p.y) + 2); 

	// maybe he has a football!
	if(p == ballcarrier) {
		if(p.team == teams.left) {
			// let's be a clever monkey and rotate the football with the player
			context.save();
			context.translate(field.x + p.x, field.y + p.y);
			context.rotate((p.t % (Math.PI * 2) * -1));
			context.scale(0.2, 0.2);
			context.drawImage(ballimg, 0, 0);
			context.restore();
		}
		else {
			context.save();
			context.translate(field.x + p.x, field.y + p.y);
			context.rotate((p.t % (Math.PI * 2) * -1));
			context.scale(0.2, 0.2);
			context.drawImage(ballimg, 0, -25);
			context.restore();
		}
	}
}

// draw the football field
function draw_field() {
	// shorter references for offsets
	var dx = field.x;
	var dy = field.y;

	// endzones
	
	// left green field
	context.fillStyle = field.endleft.color;
	context.fillRect(dx + field.endleft.x, dy + field.endleft.y, field.endleft.w, field.endleft.h);
	// logo background circle
	context.beginPath();
    context.arc(dx + (field.endleft.x + (field.endleft.w / 2)), dy + (field.endleft.y + (field.endleft.h / 2)), 
    	field.endleft.w * 0.45, 0, 2 * Math.PI, false);
    context.fillStyle = teams.left.color;
	context.fill();
	context.lineWidth = 1.2;
	context.strokeStyle = teams.left.color2;
	context.stroke();
	// logo itself, semi-transparent
	context.save();
	context.globalAlpha = 0.5;
	context.translate(dx + field.endleft.x + 2, dy + field.endleft.y + 22)
	context.scale(0.2, 0.2);
	context.drawImage(teams.left.logo, 0, 0);
	context.restore();

	// right green field, etc
	context.fillStyle = field.endright.color;
	context.fillRect(dx + field.endright.x, dy + field.endright.y, field.endright.w, field.endright.h);

	context.beginPath();
    context.arc(dx + (field.endright.x + (field.endright.w / 2)), dy + (field.endright.y + (field.endright.h / 2)), 
    	field.endright.w * 0.45, 0, 2 * Math.PI, false);
    context.fillStyle = teams.right.color2;
	context.fill();
	context.lineWidth = 1.2;
	context.strokeStyle = teams.right.color;
	context.stroke();
	
	context.save();
	context.globalAlpha = 0.5;
	context.translate(dx + field.endright.x + 2, dy + field.endright.y + 22)
	context.scale(0.2, 0.2);
	context.drawImage(teams.right.logo, 0, 0);
	context.restore();

	// fair play area
	context.fillStyle = field.play.color;
	context.fillRect(dx + field.play.x, dy + field.play.y, field.play.w, field.play.h);

	// field markings
	for(var i = 1; i < 10; i++) {
		var markers = ["0", "10", "20", "30", "40", "50", "40", "30", "20", "10"];
		context.lineWidth = 0.6;
		context.strokeStyle = "#ffffff";
		context.beginPath();
		if(i == 5) {
			context.moveTo(dx + (i * 10), dy);
			context.lineTo(dx + (i * 10), dy + (field.play.h));
		}
		else {
			context.moveTo(dx + (i * 10), dy);
			context.lineTo(dx + (i * 10), dy + (field.play.h * 0.1));

			context.moveTo(dx + (i * 10), dy + (field.play.h * 0.9));
			context.lineTo(dx + (i * 10), dy + (field.play.h));
		}	
		context.stroke();

		// and some numbers
		context.font = "4.8px Courier"; 
		context.fillStyle = "#44aa44";
		context.fillText(markers[i], dx + ((i * 10) - 3), dy + (field.play.h * .98));
	}

	// current line of scrimmage
	context.beginPath();
	context.moveTo(dx + los, dy);
	context.lineTo(dx + los, dy + (field.play.h));
	context.strokeStyle = "#ff0000";
	context.stroke();

	// first down yardage target
	context.beginPath();
	context.moveTo(dx + yardtarget, dy);
	context.lineTo(dx + yardtarget, dy + (field.play.h));
	context.strokeStyle = "#0000ff";
	context.stroke();

}

// iterate through players doing movement
function move_players(players) {
	for(var i = 0; i < players.length; i++) {
		move_player(players[i]);
	}
}

// move our dude around
function move_player(p) {
	// update heading according to turn velocity
	p.t += p.vt; 
	// then calculate movement vector components and update coords
	var dx = Math.cos(p.t) * p.v;
	var dy = Math.sin(p.t) * p.v * -1;
	p.x += dx;
	p.y += dy;
}

// iterate through players adjusting position based on collisions
function handle_collisions(players) {
	for(var i = 0; i < players.length - 1; i++) {
		for(var j = i + 1; j < players.length; j++) {
			handle_collision(players[i], players[j]);
		}
	}
}

// check players for overlap and if found push them a bit farther away from each other
function handle_collision(p1, p2) {
	var sepspeed = 8; // distance to push colliding players apart by per call;

	var dx = p1.x - p2.x; // player distance on x axis
	var dy = p1.y - p2.y; // player distance on y axis
	var d = Math.sqrt((dx*dx) + (dy*dy)); // diagnonal distance from center point to center point
	var t = Math.atan2(dy, dx); // the heading, in radians, of the diagonal vector d
	var bound = p1.size + p2.size; // minimum distance between these two players
	var overlap = bound - d;
	if(overlap > 0) {
		// these two players are closer to each other than they should be, we need to separate them a bit
		if(sepspeed > overlap) {
			// no need to push these guys farther apart than they need to be to not be overlapping
			sepspeed = overlap; 
		}

		/*  Push overlapping players away from one another.

			This approach considers the mass differential between two colliding players a good reason
			to have the balance of the pushback fall on the smaller player.  Question: is the effect too
			stark as a strict proportion like this?  TODO: consider softening the degree of influence this
			has.  Or we might otherwise modify/mitigate it with other genetic traits.
		*/
		// TODO: consider also factoring in current velocity of both players; instead of just treating it as
		//	proportionate to mass, do it as proportionate to momentum so that e.g. a fast moving light player
		//	exerts more force than a slow moving light player, and a small bullet can really overpower a
		//	lumbering cannonball if the setup is sufficiently imbalanced
		var massratio = p1.mass / (p1.mass + p2.mass);
		var pushx1 = Math.cos(t) * sepspeed * (1 - massratio);
		var pushy1 = Math.sin(t) * sepspeed * (1 - massratio);	
		var pushx2 = Math.cos(t) * sepspeed * massratio;
		var pushy2 = Math.sin(t) * sepspeed * massratio;	
		p1.x += pushx1;
		p2.x -= pushx2;
		p1.y += pushy1;
		p2.y -= pushy2;


		// also, if one of these players has the ball and the two players are on opposing teams,
		//  this could turn into a tackle which should end the play
		if((p1.team != p2.team) && (p1 == ballcarrier || p2 == ballcarrier)) {
			if(Math.random() < 0.05) { // TODO: make this some sort of expression of relative skill/genes/velocity
				var actor; // who got the tackle?
				if(p1 == ballcarrier) {
					actor = p2;
				}
				else {
					actor = p1;
				}
				// is this just a tackle, or a safety?
				if(ballcarrier.team == teams.left && ballcarrier.x < field.play.x) {
					// left team safety
					end_of_down("safety", actor);
				}
				else if (ballcarrier.team == teams.right && ballcarrier.x > field.play.x + field.play.w) {
					// right team safety
					end_of_down("safety", actor);
				}
				else {
					// just a tackle
					end_of_down("tackle", actor);
				}
			}
		}
	}
}


// check all players for down-ending positions
function check_players(players) {
	for(var i = 0; i < players.length; i++) {
		check_player(players[i]);
	}
}

// TODO: rewrite this so it's not such a goddam mess to read and debug
// TODO: fix issue where player can move from within the play area to out of bounds above or below
//		an endzone and thus never getting caught at all somehow
// see if the player is still in the field, in an endzone, or out of bounds
function check_player(p) {

	// player has run out of bounds, above or below the 100-yard play area
	if( ( (p.y < field.play.y) || (p.y > field.play.y + field.play.h) ) &&
		( (p.x > field.play.x) && (p.x < field.play.x + field.play.w) ) ) {
		if(p == ballcarrier) {
			// if it's the ballcarrier, this ends the play
			end_of_down("outofbounds");
			return;
		}
		// otherwise, just keep them from running up or down off the field beyond the OOB line
		if(p.y < field.play.y) {
			p.y = field.play.y;
		}
		else if(p.y > field.play.y + field.play.h) {
			p.y = field.play.y + field.play.h;
		}
		return;
	}
	// player is running around within the left endzone
	else if( (p.x < field.play.x) && (p.x > field.endleft.x) && (p.y > field.endleft.y) && p.y < field.endleft.y + field.endleft.h) {
		if(p == ballcarrier) {
			if(p.team == teams.right) {
				// if it's the ballcarrier and they're on the right-side team, immediate touchdown
				end_of_down("touchdown");
				return;
			}
		}
	}	
	// player is headed out of bounds from within the left endzone
	else if( (p.x < field.play.x) && 
			(p.x < field.endleft.x || p.y < field.endleft.y || p.y > field.endleft.y + field.endleft.h) ) {
		if(p == ballcarrier) {
			if(p.team == teams.left) {
				// if it's the ballcarrier and this is their own endzone, this is a safety
				end_of_down("safety");
				return;
			}
		}
		else {
			// otherwise, just keep them from wandering off
			if(p.x < field.endleft.x) {
				p.x = field.endleft.x;
			}
			if(p.y < field.endleft.y) {
				p.y = field.endleft.y;
			}
			if(p.y > field.endleft.y + field.endleft.h) {
				p.y = field.endleft.y + field.endleft.h;
			}
		}
		return;
	}

	// player is running around within the right endzone
	else if( (p.x > field.play.x + field.play.w) && (p.x < field.endright.x + field.endright.w) && 
		(p.y > field.endright.y) && (p.y < field.endright.y + field.endright.h) ) {
		if(p == ballcarrier) {
			if(p.team == teams.left) {
				// if it's the ballcarrier and they're on the left-side team, immediate touchdown
				end_of_down("touchdown");
				return;
			}
		}
	}	
	// player is headed out of bounds from within the right endzone
	else if( (p.x > field.play.x + field.play.w) &&
		(p.x > field.endright.x + field.endright.w || p.y < field.endright.y || p.y > field.endright.y + field.endright.h) ){
		if(p == ballcarrier) {
			if(p.team == teams.right) {
				// if it's the ballcarrier, this is a safety
				end_of_down("safety");
				return;
			}
		}
		else {
			// otherwise, just keep them from wandering off
			if(p.x > field.endright.x + field.endright.w) {
				p.x = field.endright.x + field.endright.w ;
			}
			if(p.y < field.endright.y) {
				p.y = field.endright.y;
			}
			if(p.y > field.endright.y + field.endright.h) {
				p.y = field.endright.y + field.endright.h;
			}
		}
		return;
	}
}

// report true if the team in possession has moved ball far enough to earn a first down, else false
function earned_first_down(deadball, team) {
	var net = deadball - yardtarget;
	if(possession == teams.right) {
		net *= -1;
	}
	if(net > 0) {
		return true;
	}
	return false;
}

// return the new goal for first down
function get_new_yardtarget(deadball, team) {
	var yt;
	if(team == teams.left) {
		yt = deadball + 10;
		if(yt > 100) {
			// goal line is yard 100
			yt = 100;
		}
	}
	else {
		yt = deadball - 10;
		if(yt < 0) {
			// goal line is yard 0
			yt = 0;
		}
	}
	return yt;
}

// return the net yardage on the play
function get_yardage(p, los) {
	var yardage = p.x - los;
	if(p.team == teams.right) {
		yardage *= -1;
	}
	yardage = Math.floor(yardage);
	return yardage;
}

// handle an end-of-down event
//  - ev is the string defining the type of event, so we can process the play accordingly;
//	- actor is the non-ballcarrier player credited with the event, for cases where there is
//		such a thing (e.g. tackling)
function end_of_down(ev, actor) {	

	// shorthand for scorekeeping stuff
	var own = ballcarrier.team;
	var other = teams.left;
	if(own == teams.left) {
		other = teams.right;
	}

	var deadball = Math.floor(ballcarrier.x + 0.5);
	var yardage = get_yardage(ballcarrier, los);
	var playcall = ""

	// First we handle scoring/announcements based on the type of end-of-down event that occurred
	if(ev == "tackle") {
		// a tackle in the fair play area 
		own.scores.yards += yardage;
		ballcarrier.scores.yards += yardage;
		if(yardage < 0) {
			playcall = "sack: " + (yardage * -1) + " yd loss";
			announce(playcall);
			other.scores.sacks++;
			if(actor != null) {
				// only checking this because of knee() cheat; ordinarily there shouldn't
				//	ever be a tackle without a tackling actor provided
				actor.scores.sacks++;
			}
		}
		else {
			playcall = "tackle: " + yardage + " yd gain";
			announce(playcall);
			other.scores.tackles++;
			if(actor != null) {
				actor.scores.tackles++;
			}
		}
		
	}
	else if(ev == "touchdown") {
		// qb carried ball into other team's endzone, woo
		playcall = "TD: " + possession.name; 
		announce(playcall);
		own.scores.points += 7;
		own.scores.touchdowns++;
		own.scores.yards += yardage;
		ballcarrier.scores.points += 7;
		ballcarrier.scores.touchdowns++;
		ballcarrier.scores.yards += yardage;
	}
	else if(ev == "outofbounds") {
		// qb carried ball out of bounds in the fair play area
		own.scores.yards += yardage;
		ballcarrier.scores.yards += yardage;
		if(yardage < 0) {
			playcall = "OOB: " + (yardage * -1) + " yd loss";
			announce(playcall);
		}
		else {
			playcall = "OOB: " + yardage + " yd gain";
			announce(playcall);
		}
	}
	else if(ev == "safety") {
		// qb was tackled in their own endzone, or playclock/gameclock ran out while they were
		// 	in said endzone
		playcall = "SAFETY: " + possession.name;
		announce(playcall);
		other.scores.safeties++;
		other.scores.points += 2;
		if(actor != null) {
			// sometimes a safety will be from a timer violation, sans tackling actor, so we need to
			//	be sure there is an opposing player before trying to give them credit
			actor.scores.safeties++;
			actor.scores.points += 2;
			other.scores.tackles++;
			actor.scores.tackles++;
		}
		own.scores.yards += yardage;
		ballcarrier.scores.yards += yardage;
		ballcarrier.scores.points -= 2;
	}
	else if(ev == "timer") {
		// playclock (or gameclock) ran out while play was still going; this functions like a vanilla tackle
		// 	except nobody gets credit for a tackle.  
		own.scores.yards += yardage;
		ballcarrier.scores.yards += yardage;
		if(yardage < 0) {
			playcall = (yardage * -1) + " yd loss";
			announce(playcall);
		}
		else {
			playcall = yardage + " yd gain";
			announce(playcall);
		}
	}

	// now set up the next play according to the type of end-of-down event that occurred and
	//	the current down info
	if(ev == "touchdown" || ev == "safety") {
		// this is definitely a change of possession, a 1st down, and a new line of scrimmage
		nextdown.possession = other;
		nextdown.down = 1;
		if(nextdown.possession == teams.left) {
			nextdown.los = 30;
			nextdown.goal = 40;
		}
		else {
			nextdown.los = 70;
			nextdown.goal = 60;
		}
	}
	else if(ev == "tackle" || ev == "outofbounds" || ev == "timer") {
		// this is either
		//	- not the fourth down, so we just go to the next down, or
		//	- the fourth down, in which case we change possession, 1st down, but keep the line of scrimmage

		// check for first down achievement
		if(earned_first_down(deadball, possession)) {
			nextdown.possession = own;
			nextdown.down = 1;
			nextdown.los = deadball;
			nextdown.goal = get_new_yardtarget(deadball, own);
		}
		else {
			// no? then it's gonna be the next down, but...
			if( (currdown + 1) > 4) {
				// if it's already been four downs, other team gets possession
				nextdown.possession = other;
				nextdown.down = 1;
				nextdown.los = deadball;
				nextdown.goal = get_new_yardtarget(deadball, other);
			}
			else {
				// otherwise just set it up for down + 1
				nextdown.possession = own;
				nextdown.down = currdown + 1;
				nextdown.los = deadball;
				nextdown.goal = yardtarget;
			}
		}

	}
	else {
		// unknown event, wtf
		console.log("Unknown end_of_down event: " + ev);
	}

	if(!is_headless && !paused) {
		print_stats();
	}

	stop_play();
	return;

}

// start the playclock over
function reset_playclock() {
	playclock = playclockmax;
}

function reset_gameclock() {
	gameclock = gameclockmax;
}

// pause/unpause the iteration of generations
var paused = false;
function pause() {
	paused = !paused;
}

// freeze the action and display a message
function stop_play() {
	state = "timeout";
	timer = playdelay;
	reset_playclock();
}

// set up the next play based on content stored in nextdown at end of previous down
function next_play() {
	// track whether this is a change of possession from last down
	var possession_changed = false;
	if(possession != nextdown.possession) {
		possession_changed = true;
	}

	// TODO handle the current game state globals here as just another instance of the same kind of object
	//	as nextdown, instead of some coincidentally similar globals
	currdown = nextdown.down;
	possession = nextdown.possession;
	los = nextdown.los;
	yardtarget = nextdown.goal;

	// Assign random player on team as qb when the team gains possession of ball, to give multiple players a chance
	//	to generate some qb-specific fitness in a given game
	if(possession_changed) {
		// pick a new qb on the team that just took possession
		ballcarrier = possession.roster[Math.floor(Math.random() * possession.roster.length)];
	}

	for(var i = 0; i < players.length; i++) {
		reset_player(players[i]);
	}
	/* because players are currently assigned random y positions on their respective sides of the
		line of scrimmage, some may start the play significantly overlapping; a few calls to the
		handle_collisions() function forces them to spread out into a non-overlapping clump.
	*/
	handle_collisions(players);
	handle_collisions(players);
	handle_collisions(players);
	handle_collisions(players);
	handle_collisions(players);
	/* TODO sanity check position of ballcarrier to make sure he hasn't been shoved out of bounds by
		the collision code above, particularly in the case of a play in the near endzone which could lead
		to an instant safety but also potentially for instant out-of-bounds scenarios in the the fair play
		area of the field.
	*/ 
	
	state = "preplay";
	timer = preplaydelay;
}

// testing a corner bug: qb tries to step diagonally out of corner of right field
function qbescape() {
	ballcarrier.x = 90;
	ballcarrier.y = 10;
	ballcarrier.t = Math.PI * 0.25;
	ballcarrier.vt = 0;
	ballcarrier.v = 0.5;
}

// testing cheat for forced end-of-down scenarios
function knee() {
	// force a "tackle" for testing
	end_of_down("tackle");
}

// TODO rewrite these and related calls to just pass a reference to the player, now that the code's
//	been rewritten to assign team roster index values to players a the p.id attribute
// given a list of players, return index of the best performer
function find_best_player(team) {
	var best = -10000000000; // an impossibly low player value, presumably
	var besti = 0;
	for(var i = 0; i < team.length; i++) {
		var p = team[i];
		var f = get_value(p);
		if(f > best) {
			best = f;
			besti = i;
		}
	}
	return besti;
}

// given a list of players, return index of the worst performer
function find_worst_player(team) {
	var worst = 10000000000; // an impossibly high player value, presumably
	var worsti = 0;
	for(var i = 0; i < team.length; i++) {
		var p = team[i];
		var f = get_value(p);
		if(f < worst) {
			worst = f;
			worsti = i;
		}
	}
	return worsti;
}

// analyze qb's field position and call end_of_down with appropriate value
function clock_violation() {
	announce("Playclock expired!");
	if( (possession == teams.left && ballcarrier.x < field.play.x) ||
		(possession == teams.right && ballcarrier.x > field.play.x + field.play.w) ) {
		// current ball carrier is in his own endzone, this is a safety
		end_of_down("safety");
	}
	else {
		// ball carrier is in the fair play area, this is just an unforced end of down 
		end_of_down("timer");
	}
}

// handle the end of the current match (due to time being up, probably?)
function game_over() {
	// end the current play as if the playclock was up
	clock_violation();

	// and do final score stuff, get ready for next match.
	var fstring = "Game " + gamesplayed + ": " + teams.left.name3 + " " + teams.left.scores.points + ", " + teams.right.name3 + " " + teams.right.scores.points;
	final(fstring);
	gamesplayed++;
	warpgames++;
	teams.left.played++;
	teams.right.played++;
	if(teams.left.scores.points == teams.right.scores.points) {
		teams.left.tied++;
		teams.right.tied++;
	}
	else if(teams.left.scores.points > teams.right.scores.points) {
		teams.left.won++;
		teams.right.lost++;
	}
	else {
		teams.left.lost++;
		teams.right.won++;
	}

	///// FIRING & BREEDING //////

	// handle firing/breeding issues for each team that just finished the game
	var gpf = $("#gamesperfiringslider").val(); // read from settign on page -- this feels a bit hacky
	var ppf = $("#percentperfiringslider").val();
	var pc = $("#percentcloning").val();
	var pm = $("#percentmating").val();
	var pr = $("#percentrandom").val();

	// normalize our breeding strategies to probability fractions of 1.0
	var ptotal = (Number(pc) + Number(pm) + Number(pr));
	if(pc == 0 && pm == 0) {
		// if we don't have any other breeding strategies, we should do nothing but random
		pr = 1;
	}
	else {
		// normalize probability values
		pc = pc / ptotal;
		pm = pm / ptotal;
		pr = pr / ptotal;
	}

	var mutationrate = Number($("#mutationrateslider").val()) / 100;

	var tm = [teams.left, teams.right];
	for(var k = 0; k < tm.length; k++) {
		var t = tm[k];
		if(t.played % gpf == 0) {
			// this is the nth game for this team for the current games per firing value of n, so proceed

			// TODO Rewrite this shit to actually just track the ids/indexes of players to replace maybe, instead
			//	of having to deal with this whole keepers/losers list building shit?
			var keepers = [];
			var losers = [];
			// first, make a copy of the team roster
			for(var i = 0; i < t.roster.length; i++) {
				keepers.push(t.roster[i]);
			}

			// next, get rid of the worst player(s)
			var replacing = Math.ceil(keepers.length * (ppf / 100) );
		//	console.log(t.name + " GM is firing " + replacing + " players");
			for(var i = 0; i < replacing; i++) {
				// cull this many players...
				var firei = find_worst_player(keepers); // find a loser
		//		console.log(keepers[firei].number + " " + keepers[firei].lastname + " is worst, with " + get_value(keepers[firei]) );
				losers.push(keepers[firei]); // add them to losers
				keepers.splice(firei, 1); // ditch them from keepers
			}
			var newbies = []; // our new recruits
			for(var i = 0; i < replacing; i++) {
				// ...and then generate as many players to replace them, from among our mixed strategies
				//	Note: need to sanity check some strategies to make sure we have enough original players
				//		to do them.  Cloning requires one non-fired player at least; mating requires two.
				var choice = Math.random(); // random value between 0 and 1, for selecting a breeding strategy
				if(choice < pm && keepers.length >= 2) {
					// let's breed from a couple of our keepers
					newbies.push( mutate_player( mate_player(keepers[0], keepers[1]), mutationrate) ); 
		//			console.log("Mating a new player...");
				}
				else if(choice < pc + pm && keepers.length >= 1) {
					// let's clone from one of our keepers
					newbies.push(mutate_player(keepers[0], mutationrate)); // mutating clone from top of list 
		//			console.log("Cloning a new player...");
				}
				else {
					// let's generate a random player
					newbies.push(initialize_random_player());
		//			console.log("Randomizing a new player...")
				}
				// set up this new player with relevant player & team info
				newbies[i].number = losers[i].number;
				newbies[i].team = losers[i].team; // TODO revisit this given rework of player.team from string label to object reference?
				newbies[i].id = losers[i].id;
				newbies[i].hired = losers[i].team.played;
				newbies[i].fired = "n/a";

				// and set up the fired player for retirement
				losers[i].fired = losers[i].team.played;

				t.roster[newbies[i].id] = newbies[i];
				//t.roster[newbies[i].number - 1] = newbies[i]; // this is a terrible use of modified-index-as-name, is what.  Jesus.
			}
			firedplayers = firedplayers.concat(losers);
		}
	}

	// and kick off our next game
	initiate_random_game();
}

// return a randomly selected team definition
function generate_team() {
	var team = new Object();

	// grab a random team definition, pull it out of circulation, and assign that to this team
	var r = Math.floor(Math.random() * teamdefs.length);
	var tdef = teamdefs.splice(r, 1)[0];
	team.name = tdef[0];
	team.color = tdef[1];
	team.color2 = tdef[2];
	team.name3 = team.name.substring(0,3).toUpperCase();	// three letter abbreviation
	team.name1 = team.name.substring(0,1);	// initial

	team.logo = new Image();
	team.logo.src = "logos/" + team.name + ".png";

	team.played = 0; // total games played
	team.won = 0; 	// games won
	team.lost = 0; 	// games lost
	team.tied = 0;	// games tied

	team.id;	// index into league list of teams

	team.roster = [];
	team.roster = generate_players(teamsize, team); // generate a set of players

	return team;
}


// roll up a whole slate of teams for use in games
function generate_league(size) {

	/* Team definitions; these'll be pulled from when generating the league, on per team.
	Format:
	0 - team name
	1 - primary team color
	2 - secondary team color
	*/
	teamdefs = [ 
		["Crows", "#005518", "#aba900"],
		["Doves", "#623a00", "#b4a988"],
		["Emus", "#001eb8", "#9aa1c6"],
		["Grackles", "#600191", "#7aac64"],
		["Penguins", "#850000", "#bba31b"],
		["Robins", "#3b3b3b", "#b18de6"],
		["Storks", "#6f672d", "#e45b36"],
		["Toucans", "#2c5d5c", "#b1b1b1"],
	];

	league = []; // our new league
	for(var i = 0; i < size; i++) {
		var t = generate_team();
		t.id = i;
		if(teamsize == 1) {
			t.name = t.name.substring(0,t.name.length - 1); // depluralize team name if only a single player
		}
		league.push(t);
	}
	return league;
}

// grab two distinct teams at random from the league list
function get_random_pair_of_teams() {
	var limit = league.length;
	var t = [];
	var left = Math.floor(Math.random() * limit); // pick a team index at random
	var right = (Math.floor(Math.random() * (limit - 1)) + left + 1) % limit; // pick a non-left index
	t.push(league[left]);
	t.push(league[right]);
	return t;
}

// do a bunch of setup for a new match between random teams
function initiate_random_game() {
	
	// and generate two teams
	teams = new Object();
	var t = get_random_pair_of_teams();
	teams.left = t[0];
	teams.right = t[1];

	players = []; // global list of players active in this game
	for(var i = 0; i < teams.left.roster.length; i++) {
		teams.left.roster[i].team = teams.left;
		teams.left.roster[i].played++; // have played another game of football!
		players.push(teams.left.roster[i]);
	}
	for(var i = 0; i < teams.right.roster.length; i++) {
		teams.right.roster[i].team = teams.right;
		teams.right.roster[i].played++;
		players.push(teams.right.roster[i]);
	}

	reset_scores();
	reset_playcalls();
	reset_gameclock();
	reset_playclock();

	currdown = 1;
	possession = teams.left;
	los = 30;
	yardtarget = los + 10;
	if(Math.random() > 0.5) {
		possession = teams.right;
		los = 70;
		yardtarget = los - 10;
	}
	// TODO make a simple "get a qb" utility function to tear this array index math out of here
	ballcarrier = possession.roster[Math.floor(Math.random() * possession.roster.length)]; // starting qb
	announce(possession.name + " win the coinflip");

	reset_nextdown();
	next_play();
	print_stats(); // refresh from game start

}

// create a balanced set of player objects
function generate_players(size, team) {
	var pl = [];  // a new list of players
	for(var i = 0; i < size; i++) {
		var newp = initialize_random_player();
		newp.number = i + 1; // this is cosmetic and arbitrary, display number for drawing player and stats
		newp.id = i; // this is not arbitrary -- it's the index into the player's teams roster
		newp.team = team;
		newp.hired = team.played;
		newp.fired = "n/a";
		pl.push(newp);
	}
	return pl;
}

// TODO establish a general template of an object for handling instances of sets-of-scores, to facilitate
//	easily keeping lists of player- and team-specific stats over the history of games in the league.
// reset current game team scores to zero
function reset_scores() {

	var ls = new Object();
	ls.points = 0;
	ls.yards = 0;
	ls.tackles = 0;
	ls.sacks = 0;
	ls.touchdowns = 0;
	ls.safeties = 0;
	teams.left.scores = ls;

	var rs = new Object();
	rs.points = 0;
	rs.yards = 0;
	rs.tackles = 0;
	rs.sacks = 0;
	rs.touchdowns = 0;
	rs.safeties = 0;
	teams.right.scores = rs;	

}

// reset next down object to game-initial values
function reset_nextdown() {
	nextdown.possession = possession;
	nextdown.los = los;
	nextdown.goal = yardtarget;
	nextdown.down = currdown;
}

// reset the play-by-play list to empty
function reset_playcalls() {
	playcalls = [];
}

function reset_finalscores() {
	finalscores = [];
}

// get input from the control on the page and use them to start a new league
function start_new_league_button() {
	var lsize = $("#lsizevalue").val() || leaguesize;
	var tsize = $("#tsizevalue").val() || teamsize;
	var glength = $("#glengthvalue").val() || gameclockmax;
	// TODO sanity check this shit in case of weird input, falling back to good defaults?

	start_new_league(lsize, tsize, glength);
}

// regenerate all the league content and restart from game 1
function start_new_league(lsize, tsize, glength) {

	leaguesize = lsize; 
	teamsize = tsize; 
	gameclockmax = glength;

	gamesplayed = 0;
	reset_playcalls();
	reset_finalscores();

	// generate a roster of teams for the league
	generate_league(leaguesize);
	// set up the firedplayers array for tracking people who get canned
	firedplayers = [];
	// and kick off our first game
	initiate_random_game();

	// set initial speed to normal frame rate
	turbo_enabled = 0;
	change_speed(1);
}

// alter the simulation framerate and scale time-sensitive controls accordingly
function change_speed(multiplier) {
	var framestandard = 30; // standard reference framerate
	var turbo = multiplier; // sim speed mult. factor
	framelimit = framestandard / turbo; // how many ms per frame we'll try for
	frameskip = (framelimit / 1000) * turbo; // how much time to pull of play/game clocks per frame
	playdelay = 1 / turbo; // how long to stay on current play once it ends
	preplaydelay = 0.5 / turbo; // how long to stay on new play after it's been set up before action
	clearInterval(theloop);
	theloop = setInterval(gameloop, framelimit);
}

// hacky experiment in accelerated processing without browser display updates
var is_headless = false;
var go_headless = false;
var warplimit = 100000;
var warpgames;
var warpgamelimit = 1;
// set a flag to go headless at end of next gameloop
function timewarp() {
	if(paused) {
		// warping while paused makes no sense (and seems to cause terrible things, too), so let's
		//	just unpause before proceeding.
		pause();
	}
	if(turbo_enabled) {
		// likewise, turbo + timewarp makes no sense, so let's just make sure we turn turbo off
		toggle_speed();
	}
	if(!is_headless) {
		// no idea what would happen if we tried to warp while warping, so let's be cautious
		warpgamelimit = $("#warpvalue").val();
		go_headless = true;
	}
}

// uncouple graphics/setInterval loop and run sim super fast for a fixed number of game loops
function headless() {
	clearInterval(theloop);
	playdelay = 0;
	preplaydelay = 0;
	warpgames = 0;
	while(is_headless == true) {
		gameloop();
		if(warpgames == warpgamelimit) {
			is_headless = false;
			change_speed(1);
			print_stats(); // update the stats to show the passage of time immediately
			return;
		}
	}
}

// switch between predefined turbo setting and normal speed
var turbo_enabled = false;
var turbo_rate = 10;
function toggle_speed() {
	if(turbo_enabled) {
		change_speed(1);
	}
	else {
		change_speed(turbo_rate);
	}
	turbo_enabled = !turbo_enabled;
}

// the core game loop we execute once per game frame
function gameloop() {

	var now = Date.now();
	var dt = (now - lastframe) / 1000;
	lastframe = now;

	if(!paused) {
		gameclock -= frameskip; // hackity hack
	}

	if(gameclock <= 0) {
		game_over();
	}

	if(playclock <= 0) {
		clock_violation();
	}

	if(state == "timeout") {
		timer -= dt;
		if(timer <= 0) {
			timer = 0;
			state = "ready";
		}
	}
	else if(state == "ready") {
		next_play();
	}
	else if(state == "preplay") {
		timer -= dt;
		if(timer <= 0) {
			timer = 0;
			state = "playing";
		}
	}

	if(!paused && state == "playing") {
		playclock -= frameskip; // solves 1fps clamping issue, but hacky; how might this go wrong?
		move_players(players);
		handle_collisions(players);
	}
	// handle_collisions as currently implemented may induce a change in state's value,
	// so we do a seperate check afterward here for player status
	if(!paused && state == "playing") {
		check_players(players);
	}

	if(go_headless == false && is_headless == false) {
		draw_canvas();
	}
	else if(go_headless == true) {
		is_headless = true;
		go_headless = false;
		headless();
	}
	else {
		// do nothing, we're just runnin' headless until we're not
	}

}


// let's get this party started
start_new_league_button();