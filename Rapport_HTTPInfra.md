#### Auteurs : Rémy Nasserzare & Miguel Gouveia

# Labo HTTPInfra [RES]


### Etape 1 : serveur statique HTTP (avec apache httpd)

Cette première partie consistait à mettre en place un serveur httpd apache, qui met à disposition du contenu, qui est statique.
Il faut pour cela préparer une image docker, qui contient un serveur apache fonctionnel.

Notre Dockerfile contient les instructions :

	FROM php:7.0-apache

	COPY src/ /var/www/html/

Grâce au Dockerfile, nous pouvons construire une image apache (avec la version php 7.0), et copier le contenu de src/ dans /var/www/html, qu'on utilise pour mettre à disposition le contenu statique).
Le contenu statique a été téléchargé depuis 

	startbootstrap.com/template-overviews/ 

qui est un template qui fonctionne très bien avec un framework html/css nommé bootstrap, qui aide à la mise en page d'un site web.

Maintenant qu'on a mis en place le Dockerfile et toute l'arborescence, on construit l'image docker (enfin), en faisant la commande :

	"docker build -t res/apache_php <chemin_absolu_vers_dockerfile>"

Et pour lancer le container, on fait :

	"docker run -d --name apache_static res/apache_php ls"

L'option --name permet de nommer le container.


### Etape 2 : serveur HTTP dynamique avec express.js

Lors de cette étape, le but est de mettre en place un serveur HTTP qui propose du contenu dynamique, grâce à la librairie express.js et au framework Node.js.
La même démarche que dans l'étape 1 est nécessaire, par rapport à la création d'un Dockerfile qui permet une construction d'image dans un environnement Node.js. 

Dockerfile :

	FROM node:8.11

	COPY src /opt/app

	CMD ["node", "/opt/app/"]


Ce Dockerfile nous permet de mettre en place un environnement Node.js avec la version 8.11, où le contenu de /opt/app copie celui de src, qui est sur notre machine. Il contient les fichiers assurant le bon fonctionnement de notre serveur.

Le fichier index.js est ainsi créé dans ce répertoire, et il contient des instructions qui permet de retourner une liste de villes (associées à un pays) au client HTTP.
Le serveur renvoie une liste de villes aléatoire au format JSON, (grâce à la libraire Chance.js).

Les dépendances aux librairies pour le code sont toutes gérées avec les fichiers package-lock.json et package.json.
Les librairies utilisées sont ajoutées avec la commande :
" nom install --save chance express ". Dès lors que le code est fonctionnel, il faut construire l'image et démarrer le container comme suit :

	" docker build -t res/express_students <chemin_absolu_vers_dockerfile> "
 puis 
 
	" docker run -d --name express_dynamic res/express_students "


Ainsi, notre serveur est maintenant fonctionnel et disponible avec l'adresse spécifique des containers et le port (3000).


### Etape 3 : reverse proxy avec apache statique

Pour mettre en place un serveur reverse proxy apache, il nous faut activer le module du proxy.

Pour cette étape, le Dockerfile à créer et compléter aura les instructions suivantes :

	FROM php:7.0-apache

	COPY conf/ /etc/apache

	RUN a2enmod proxy proxy_http
	RUN a2ensite 000-* 001-*

Grâce à la configuration ci-dessus, on copie des fichiers de configuration générés statiquement pour notre serveur apache.
On veut également lancer le programme qui activera les modules proxy et proxy_http pour pouvoir mettre en place notre reverse proxy.

Pour que le serveur soit correctement mis en place, il faut aussi créer une configuration du virtual host, sachant qu'il y a déjà une configuration par défaut. Ce qui fera 2 fichiers de configuration,
celui par défaut (000-default.conf) et celui crée (001-reverseproxy.conf)

Le contenu sera :

	<VirtualHost *:80>

		ServerName labo.res.ch
		
		
		ProxyPass					"/api/students" "http://172.17.0.3.3000/""
		ProxyPassReverse			"/api/students/" "http://172.17.0.3:3000/"
		
		ProxyPass					"/" "http://172.17.0.2:80/"
		ProxyPassReverse			"/" "http://172.17.0.2:80/"
	
	</VirtualHost>


Le port d'entrée 80 est pris comme port d'entrée à l'entrée du container, qu'il reste à associer au 8080 qui permet de communiquer avec l'extérieur. Le nom de domaine utilisé pour appeler le serveur proxy est "labo.res.ch".
2 paires de directives gèrent chacune la redirection de requêtes au serveur dynamique express (1ere paire), ainsi que la redirection au serveur statique (2e paire). Les IP pour chaque serveur sont statiquement fixées, on verra plus tard (étape 5) que la démarche peut être dynamiquement gérée.


### Etape 4 : requêtes AJAX avec JQuery

À ce stade, nous avons nos 2 serveurs pour les requêtes, et nous pouvons les faire interagir, pour afficher le contenu statique sur notre page d'accueil, vu que chacun est accédé par 1 seul point d'entrée géré par notre reverse proxy.
Afin d'y parvenir, nous devons trouver un moyen d'installer vim au démarrage de l'image, qui sera nécessaire pour modifier des fichiers de chque serveur directement, lors de l'exécution du container.
Nous avons donc ajouté la directive suivante aux Dockerfile respectifs : 


	RUN apt-get update && \
		apt-get install -y vim
	
	
Pour la dernière partie de cette étape, il faut établir un lien dans notre page d'accueil html vers Cities.js , qui ajoutera de manière dynamique des listes de villes dans le contenu statique.

Nous ajoutons donc cette instruction à la fin de notre code html :

	< !-- Custom script for load cities and zip -->
	<script src="js/cities.js"></script>

Maintenant nous pouvons utiliser AJAX pour mettre à jour la page dynamiquement, sans devoir la mettre à jour manuellement.
Ainsi, le script ajoutera de manière dynamique une liste de villes à la balise .list-cities (en asynchrone).

On met également à jour le Dockerfile permettant la construction d'image dans l'environnement Node.js créé à l'étape 2, pour avoir la version 8.11.2.




### Etape 5 : reverse proxy configuration dynamique

Notre serveur reverse proxy spécifie les IP de chaque serveur statiquement.
Ceci n'est pas pratique, en effet il faut lancer à chaque fois les containers dans l'ordre pour s'assurer qu'ils aient les adresses correctes.
Pour corriger ce problème, on génère un script php, qui utilise des variables d'environnement pour réécrire notre fichier de configuration (001-reverse-proxy.conf) de notre reverse proxy, et ceci mettra donc à jour de manière dynamique les adresses IP qu'on aura mis stockées dans les variables, dès le lancement du proxy !

Au moment du lancement du container du serveur reverse proxy, on spécifie alors les variables d'environnement qui seront utilisées par le script.
Enfin, il est maintenant possible de lancer 2 containers de serveur statique et dynamique, pusi récupérer leurs adresses IP, et enfin de les mentionner dans les variables d'environnement.

Dockerfile : (ajout des 2 copy)

	FROM php:7.0-apache
	
	COPY apache2-foreground /usr/local/bin/
	COPY templates /var/apache2/templates

	COPY conf/ /etc/apache

	RUN a2enmod proxy proxy_http
	RUN a2ensite 000-* 001-*


### Bonus

#### Load Balancer

Nous voulons avoir la possibilité d'ajouter plusieurs serveurs (statiques ou dynamiques), ce qui répartirait la charge des requêtes, et donc il faut modifier le Dockerfile du reverse proxy, pour qu'il puisse gérer cette fonctionnalité.

Maintenant que c'est fait, il faut modifier le script php, afin qu'il puisse traiter 3 paires d'adresses IP pour 6 serveurs, qui se répartiront la charge entre eux (3 serveurs apache statiques, et 3 serveurs express dynamiques).

Ce script modifié permet de distribuer les requêtes entre les serveurs disponibles.
Cela est vérifiable en ajoutant l'IP du serveur qui est sollicité en titre de page (pour le statique), et dans le JSON (pour le dynamique).
En actualisant plusieurs fois l'affichage nosu pouvons constater que l'adresse change parfois.
On peut donc en conclure que la charge (en terme de nombre de requêtes attribuées à un serveur disponible) est bel et bien répartie.

Source nous ayant aidé pour la solution :

	https://support.rackspace.com/how-to/simple-load-balancing-with-apache/
	






#### Sticky Sessions


#### Management UI

Vidéo qui nous a aidé pour trouver la solution :

	https://www.youtube.com/watch?v=GNG6PDFxQyQ
	
	
La commande à effectuer tient en une ligne, bien qu'assez complexe :

	docker run -it -d —name portainer -v /var/run/docker.sock:/var/run/docker.sock -p 9000:9000 portainer/portainer