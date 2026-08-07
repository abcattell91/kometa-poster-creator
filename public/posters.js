const MOVIE = {
    BEST_OF_DECADE: [
        {
            "type": "best-of",
            "name": "1970s",
            "lines": [
                "1970s",
                "best of"
            ],
            "url": "assets/Movie/Decade/Background.png"
        },
        {
            "type": "best-of",
            "name": "1980s",
            "lines": [
                "1980s",
                "best of"
            ],
            "url": "assets/Movie/Decade/Background.png"
        },
        {
            "type": "best-of",
            "name": "1990s",
            "lines": [
                "1990s",
                "best of"
            ],
            "url": "assets/Movie/Decade/Background.png"
        },
        {
            "type": "best-of",
            "name": "2000s",
            "lines": [
                "2000s",
                "best of"
            ],
            "url": "assets/Movie/Decade/Background.png"
        },
        {
            "type": "best-of",
            "name": "2010s",
            "lines": [
                "2010s",
                "best of"
            ],
            "url": "assets/Movie/Decade/Background.png"
        },
        {
            "type": "best-of",
            "name": "2020s",
            "lines": [
                "2020s",
                "best of"
            ],
            "url": "assets/Movie/Decade/Background.png"
        }
    ],
    GENRE: [
        {
            "type": "genre",
            "name": "Action",
            "lines": [
                "Action",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Adventure",
            "lines": [
                "Adventure",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Animation",
            "lines": [
                "Animation",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Comedy",
            "lines": [
                "Comedy",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Crime",
            "lines": [
                "Crime",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Disaster",
            "lines": [
                "Disaster",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Documentary",
            "lines": [
                "Documentary",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Drama",
            "lines": [
                "Drama",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Family",
            "lines": [
                "Family",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Fantasy",
            "lines": [
                "Fantasy",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "History",
            "lines": [
                "History",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Horror",
            "lines": [
                "Horror",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Music",
            "lines": [
                "Music",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Mystery",
            "lines": [
                "Mystery",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Romance",
            "lines": [
                "Romance",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "RomanticComedy",
            "lines": [
                "Romantic Comedy",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "RomanticDrama",
            "lines": [
                "Romantic Drama",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Sci-Fi",
            "lines": [
                "Sci-Fi",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Sports",
            "lines": [
                "Sports",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Stand-Up",
            "lines": [
                "Stand-Up",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Thriller",
            "lines": [
                "Thriller",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "War",
            "lines": [
                "War",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Western",
            "lines": [
                "Western",
                "genre"
            ]
        }
    ]
}

const ANIME_SEASONS = [
    {
        "type": "season",
        "name": "Current Season/poster",
        "lines": ["Current Season"],
        "color": "#FFA133"
    }
];

for (let year = 2050; year >= 2000; year--) {
    for (const season of ["Fall", "Summer", "Spring", "Winter"]) {
        ANIME_SEASONS.push({
            "type": "season",
            "name": `${season} ${year}/poster`,
            "lines": [`${year} ${season}`, "season"],
            "color": "#FFA133"
        });
    }
}

const ANIME_TRENDING = [
    {
        "type": "chart",
        "name": "Simkl Trending Today/poster",
        "lines": ["Today", "Simkl trending"],
        "color": "#33A1FF"
    },
    {
        "type": "chart",
        "name": "Simkl Trending This Week/poster",
        "lines": ["This Week", "Simkl trending"],
        "color": "#33A1FF"
    },
    {
        "type": "chart",
        "name": "Simkl Trending This Month/poster",
        "lines": ["This Month", "Simkl trending"],
        "color": "#33A1FF"
    }
];

const ANIME = {
    CHART: [
        {
            "type": "chart",
            "name": "Popular",
            "lines": [
                "Popular",
                "chart"
            ],
            "url": "assets/Anime/Chart/Popular.png",
            "overlay": true
        },
        {
            "type": "chart",
            "name": "TopRated",
            "lines": [
                "Top Rated",
                "chart"
            ],
            "url": "assets/Anime/Chart/Top Rated.png",
            "overlay": true
        },
        {
            "type": "chart",
            "name": "Trending",
            "lines": [
                "Trending",
                "chart"
            ],
            "url": "assets/Anime/Chart/Trending.png",
            "overlay": true
        }
    ],
    GENRE: [
        {
            "type": "genre",
            "name": "Action",
            "lines": [
                "Action",
                "genre"
            ],
            "url": "assets/Anime/Genre/Action.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Adventure",
            "lines": [
                "Adventure",
                "genre"
            ],
            "url": "assets/Anime/Genre/Adventure.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Cars",
            "lines": [
                "Cars",
                "genre"
            ],
            "url": "assets/Anime/Genre/Cars.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Comedy",
            "lines": [
                "Comedy",
                "genre"
            ],
            "url": "assets/Anime/Genre/Comedy.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Demons",
            "lines": [
                "Demons",
                "genre"
            ],
            "url": "assets/Anime/Genre/Demons.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Drama",
            "lines": [
                "Drama",
                "genre"
            ],
            "url": "assets/Anime/Genre/Drama.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Fantasy",
            "lines": [
                "Fantasy",
                "genre"
            ],
            "url": "assets/Anime/Genre/Fantasy.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Game",
            "lines": [
                "Game",
                "genre"
            ],
            "url": "assets/Anime/Genre/Game.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Gourmet",
            "lines": [
                "Gourmet",
                "genre"
            ],
            "url": "assets/Anime/Genre/Gourmet.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Historical",
            "lines": [
                "Historical",
                "genre"
            ],
            "url": "assets/Anime/Genre/Historical.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Horror",
            "lines": [
                "Horror",
                "genre"
            ],
            "url": "assets/Anime/Genre/Horror.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Isekai",
            "lines": [
                "Isekai",
                "genre"
            ],
            "url": "assets/Anime/Genre/Isekai.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "MartialArts",
            "lines": [
                "Martial Arts",
                "genre"
            ],
            "url": "assets/Anime/Genre/Martial Arts.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Mecha",
            "lines": [
                "Mecha",
                "genre"
            ],
            "url": "assets/Anime/Genre/Mecha.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Military",
            "lines": [
                "Military",
                "genre"
            ],
            "url": "assets/Anime/Genre/Military.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Music",
            "lines": [
                "Music",
                "genre"
            ],
            "url": "assets/Anime/Genre/Music.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Mystery",
            "lines": [
                "Mystery",
                "genre"
            ],
            "url": "assets/Anime/Genre/Mystery.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Parody",
            "lines": [
                "Parody",
                "genre"
            ],
            "url": "assets/Anime/Genre/Parody.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Police",
            "lines": [
                "Police",
                "genre"
            ],
            "url": "assets/Anime/Genre/Police.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Psychological",
            "lines": [
                "Psychological",
                "genre"
            ],
            "url": "assets/Anime/Genre/Psychological.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Romance",
            "lines": [
                "Romance",
                "genre"
            ],
            "url": "assets/Anime/Genre/Romance.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Samurai",
            "lines": [
                "Samurai",
                "genre"
            ],
            "url": "assets/Anime/Genre/Samurai.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "School",
            "lines": [
                "School",
                "genre"
            ],
            "url": "assets/Anime/Genre/School.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Sci-Fi",
            "lines": [
                "Sci-Fi",
                "genre"
            ],
            "url": "assets/Anime/Genre/Sci-Fi.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Shoujo",
            "lines": [
                "Shoujo",
                "genre"
            ],
            "url": "assets/Anime/Genre/Shoujo.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Shounen",
            "lines": [
                "Shounen",
                "genre"
            ],
            "url": "assets/Anime/Genre/Shounen.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "SliceofLife",
            "lines": [
                "Slice of Life",
                "genre"
            ],
            "url": "assets/Anime/Genre/Slice of Life.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Space",
            "lines": [
                "Space",
                "genre"
            ],
            "url": "assets/Anime/Genre/Space.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Sports",
            "lines": [
                "Sports",
                "genre"
            ],
            "url": "assets/Anime/Genre/Sports.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "SuperPower",
            "lines": [
                "Super Power",
                "genre"
            ],
            "url": "assets/Anime/Genre/Super Power.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Supernatural",
            "lines": [
                "Supernatural",
                "genre"
            ],
            "url": "assets/Anime/Genre/Supernatural.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Suspense",
            "lines": [
                "Suspense",
                "genre"
            ],
            "url": "assets/Anime/Genre/Suspense.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Thriller",
            "lines": [
                "Thriller",
                "genre"
            ],
            "url": "assets/Anime/Genre/Thriller.png",
            "overlay": true
        },
        {
            "type": "genre",
            "name": "Vampire",
            "lines": [
                "Vampire",
                "genre"
            ],
            "url": "assets/Anime/Genre/Vampire.png",
            "overlay": true
        }
    ],
    SEASON: ANIME_SEASONS
}

const SHOW = {
    GENRE: [
        {
            "type": "genre",
            "name": "Action",
            "lines": [
                "Action",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Adventure",
            "lines": [
                "Adventure",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Animation",
            "lines": [
                "Animation",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Comedy",
            "lines": [
                "Comedy",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Crime",
            "lines": [
                "Crime",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Disaster",
            "lines": [
                "Disaster",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Documentary",
            "lines": [
                "Documentary",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Drama",
            "lines": [
                "Drama",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Family",
            "lines": [
                "Family",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Fantasy",
            "lines": [
                "Fantasy",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "History",
            "lines": [
                "History",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Horror",
            "lines": [
                "Horror",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Music",
            "lines": [
                "Music",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Mystery",
            "lines": [
                "Mystery",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Romance",
            "lines": [
                "Romance",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "RomanticComedy",
            "lines": [
                "Romantic Comedy",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "RomanticDrama",
            "lines": [
                "Romantic Drama",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Sci-Fi",
            "lines": [
                "Sci-Fi",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Sports",
            "lines": [
                "Sports",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Stand-Up",
            "lines": [
                "Stand-Up",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Thriller",
            "lines": [
                "Thriller",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "War",
            "lines": [
                "War",
                "genre"
            ]
        },
        {
            "type": "genre",
            "name": "Western",
            "lines": [
                "Western",
                "genre"
            ]
        }
    ],
    CHART: [
        {
            "type": "chart",
            "name": "Trending",
            "lines": ["Trending", "chart"]
        },
        {
            "type": "chart",
            "name": "TopRated",
            "lines": ["Top Rated", "chart"]
        },
        {
            "type": "chart",
            "name": "Popular",
            "lines": ["Popular", "chart"]
        },
    ]
}

const SHARED = {
    AUDIO: [
        {
            "type": "audio",
            "name": "other",
            "lines": [
                "Other",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ab",
            "lines": [
                "Abkhazian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "aa",
            "lines": [
                "Afar",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "af",
            "lines": [
                "Afrikaans",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ak",
            "lines": [
                "Akan",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sq",
            "lines": [
                "Albanian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "am",
            "lines": [
                "Amharic",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ar",
            "lines": [
                "Arabic",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "an",
            "lines": [
                "Aragonese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "hy",
            "lines": [
                "Armenian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "as",
            "lines": [
                "Assamese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "av",
            "lines": [
                "Avaric",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ae",
            "lines": [
                "Avestan",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ay",
            "lines": [
                "Aymara",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "az",
            "lines": [
                "Azerbaijani",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "bm",
            "lines": [
                "Bambara",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ba",
            "lines": [
                "Bashkir",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "eu",
            "lines": [
                "Basque",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "be",
            "lines": [
                "Belarusian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "bn",
            "lines": [
                "Bengali",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "bi",
            "lines": [
                "Bislama",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "bs",
            "lines": [
                "Bosnian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "br",
            "lines": [
                "Breton",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "bg",
            "lines": [
                "Bulgarian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "my",
            "lines": [
                "Burmese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ca",
            "lines": [
                "Catalan",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ch",
            "lines": [
                "Chamorro",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ce",
            "lines": [
                "Chechen",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ny",
            "lines": [
                "Chichewa",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "zh",
            "lines": [
                "Chinese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "cv",
            "lines": [
                "Chuvash",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "kw",
            "lines": [
                "Cornish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "co",
            "lines": [
                "Corsican",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "cr",
            "lines": [
                "Cree",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "hr",
            "lines": [
                "Croatian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "cs",
            "lines": [
                "Czech",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "da",
            "lines": [
                "Danish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "dv",
            "lines": [
                "Divehi",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "nl",
            "lines": [
                "Dutch",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "dz",
            "lines": [
                "Dzongkha",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "en",
            "lines": [
                "English",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "eo",
            "lines": [
                "Esperanto",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "et",
            "lines": [
                "Estonian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ee",
            "lines": [
                "Ewe",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "fo",
            "lines": [
                "Faroese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "fj",
            "lines": [
                "Fijian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "fil",
            "lines": [
                "Filipino",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "fi",
            "lines": [
                "Finnish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "fr",
            "lines": [
                "French",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ff",
            "lines": [
                "Fulah",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "gd",
            "lines": [
                "Gaelic",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "gl",
            "lines": [
                "Galician",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "lg",
            "lines": [
                "Ganda",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ka",
            "lines": [
                "Georgian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "de",
            "lines": [
                "German",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "el",
            "lines": [
                "Greek",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "gn",
            "lines": [
                "Guarani",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "gu",
            "lines": [
                "Gujarati",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ht",
            "lines": [
                "Haitian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ha",
            "lines": [
                "Hausa",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "he",
            "lines": [
                "Hebrew",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "hz",
            "lines": [
                "Herero",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "hi",
            "lines": [
                "Hindi",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "hu",
            "lines": [
                "Hungarian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "is",
            "lines": [
                "Icelandic",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "io",
            "lines": [
                "Ido",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ig",
            "lines": [
                "Igbo",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "id",
            "lines": [
                "Indonesian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ia",
            "lines": [
                "Interlingua",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ie",
            "lines": [
                "Interlingue",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "iu",
            "lines": [
                "Inuktitut",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ik",
            "lines": [
                "Inupiaq",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ga",
            "lines": [
                "Irish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "it",
            "lines": [
                "Italian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ja",
            "lines": [
                "Japanese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "jv",
            "lines": [
                "Javanese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "kl",
            "lines": [
                "Kalaallisut",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "kn",
            "lines": [
                "Kannada",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "kr",
            "lines": [
                "Kanuri",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ks",
            "lines": [
                "Kashmiri",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "kk",
            "lines": [
                "Kazakh",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ki",
            "lines": [
                "Kikuyu",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "rw",
            "lines": [
                "Kinyarwanda",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ky",
            "lines": [
                "Kirghiz",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "kv",
            "lines": [
                "Komi",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "kg",
            "lines": [
                "Kongo",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ko",
            "lines": [
                "Korean",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "kj",
            "lines": [
                "Kuanyama",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ku",
            "lines": [
                "Kurdish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "lo",
            "lines": [
                "Lao",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "la",
            "lines": [
                "Latin",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "lv",
            "lines": [
                "Latvian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "li",
            "lines": [
                "Limburgan",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ln",
            "lines": [
                "Lingala",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "lt",
            "lines": [
                "Lithuanian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "lu",
            "lines": [
                "Luba-Katanga",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "lb",
            "lines": [
                "Luxembourgish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "mk",
            "lines": [
                "Macedonian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "mg",
            "lines": [
                "Malagasy",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ms",
            "lines": [
                "Malay",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ml",
            "lines": [
                "Malayalam",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "mt",
            "lines": [
                "Maltese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "gv",
            "lines": [
                "Manx",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "mi",
            "lines": [
                "Maori",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "mr",
            "lines": [
                "Marathi",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "mh",
            "lines": [
                "Marshallese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "myn",
            "lines": [
                "Mayan",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "mn",
            "lines": [
                "Mongolian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "na",
            "lines": [
                "Nauru",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "nv",
            "lines": [
                "Navajo",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ng",
            "lines": [
                "Ndonga",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ne",
            "lines": [
                "Nepali",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "no",
            "lines": [
                "Norwegian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "oc",
            "lines": [
                "Occitan",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "oj",
            "lines": [
                "Ojibwa",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "or",
            "lines": [
                "Oriya",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "om",
            "lines": [
                "Oromo",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "os",
            "lines": [
                "Ossetian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "pi",
            "lines": [
                "Pali",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ps",
            "lines": [
                "Pashto",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "fa",
            "lines": [
                "Persian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "pl",
            "lines": [
                "Polish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "pt",
            "lines": [
                "Portuguese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "pa",
            "lines": [
                "Punjabi",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "qu",
            "lines": [
                "Quechua",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "rm",
            "lines": [
                "Romansh",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "rom",
            "lines": [
                "Romany",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "rn",
            "lines": [
                "Rundi",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ru",
            "lines": [
                "Russian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sm",
            "lines": [
                "Samoan",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sg",
            "lines": [
                "Sango",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sa",
            "lines": [
                "Sanskrit",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sc",
            "lines": [
                "Sardinian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sr",
            "lines": [
                "Serbian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sn",
            "lines": [
                "Shona",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sd",
            "lines": [
                "Sindhi",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "si",
            "lines": [
                "Sinhala",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sk",
            "lines": [
                "Slovak",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sl",
            "lines": [
                "Slovenian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "so",
            "lines": [
                "Somali",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "es",
            "lines": [
                "Spanish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "su",
            "lines": [
                "Sundanese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sw",
            "lines": [
                "Swahili",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ss",
            "lines": [
                "Swati",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "sv",
            "lines": [
                "Swedish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "tl",
            "lines": [
                "Tagalog",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ty",
            "lines": [
                "Tahitian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "tai",
            "lines": [
                "Tai",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "tg",
            "lines": [
                "Tajik",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ta",
            "lines": [
                "Tamil",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "tt",
            "lines": [
                "Tatar",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "te",
            "lines": [
                "Telugu",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "th",
            "lines": [
                "Thai",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "bo",
            "lines": [
                "Tibetan",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ti",
            "lines": [
                "Tigrinya",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "to",
            "lines": [
                "Tonga",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ts",
            "lines": [
                "Tsonga",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "tn",
            "lines": [
                "Tswana",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "tr",
            "lines": [
                "Turkish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "tk",
            "lines": [
                "Turkmen",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "tw",
            "lines": [
                "Twi",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ug",
            "lines": [
                "Uighur",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "uk",
            "lines": [
                "Ukrainian",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ur",
            "lines": [
                "Urdu",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "uz",
            "lines": [
                "Uzbek",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "ve",
            "lines": [
                "Venda",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "vi",
            "lines": [
                "Vietnamese",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "vo",
            "lines": [
                "Volapük",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "wa",
            "lines": [
                "Walloon",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "cy",
            "lines": [
                "Welsh",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "wo",
            "lines": [
                "Wolof",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "xh",
            "lines": [
                "Xhosa",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "yi",
            "lines": [
                "Yiddish",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "yo",
            "lines": [
                "Yoruba",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "za",
            "lines": [
                "Zhuang",
                "audio"
            ]
        },
        {
            "type": "audio",
            "name": "zu",
            "lines": [
                "Zulu",
                "audio"
            ]
        }
    ],
    RESOLUTION: [
        {
            "type": "resolution",
            "name": "4K",
            "lines": ["4K", "resolution"],
            "color": "#FF5733"
        },
        {
            "type": "resolution",
            "name": "1080P",
            "lines": ["1080P", "resolution"],
            "color": "#FF5733"
        },
        {
            "type": "resolution",
            "name": "720P",
            "lines": ["720P", "resolution"],
            "color": "#FF5733"
        },
        {
            "type": "resolution",
            "name": "480P",
            "lines": ["480P", "resolution"],
            "color": "#FF5733"
        }
    ]
}

const POSTERS = {
    'Movie': {
        'Best Of Decade': MOVIE.BEST_OF_DECADE,
        'Genre': MOVIE.GENRE
    },
    'Anime': {
        'Chart': ANIME.CHART,
        'Genre': ANIME.GENRE,
        'Season': ANIME.SEASON,
        'Trending': ANIME_TRENDING
    },
    'Show': {
        'Chart': SHOW.CHART,
       'Genre': SHOW.GENRE
    },
    'Shared': {
        'Audio': SHARED.AUDIO,
        'Resolution': SHARED.RESOLUTION
    },
};
