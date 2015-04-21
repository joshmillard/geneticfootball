Genetic Football - <a href="http://joshmillard.com/football/">site</a> - <a href="https://github.com/joshmillard/geneticfootball">github</a>

Josh Millard 2015 -- <a href="https://twitter.com/joshmillard">@joshmillard</a>


Genetic Football is an application of the idea of genetic algorithms to a (very simplified) model of American football.  Each football player has a genotype that manifests at player creation time as a phenotype expressing things like limb length and muscle mass, skin pigment, tendency to veer left or right, etc.  

A fitness function evaluates each players performance based on football stats like tackles, yards gained, points scored, etc, and low-performing players are discarded and replaced by new players created via a mixed strategy of clones, sexual hybrids, and genetically random newbies.

This is written in JavaScript and intended to run in a web browser; it appears to behave reasonably well both on desktops and mobile devices, though it hasn't been tested broadly.

The current code is reasonably stable, with some known edge-case issues in the simulation; there's a whole lot more that could be done in terms of basic code cleanup, generalizing functionality, and expanding the statistical tracking and fine controls of fitness evaluation.