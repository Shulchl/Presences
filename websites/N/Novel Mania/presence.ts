import { ActivityType, Assets } from 'premid'

const presence = new Presence({
  clientId: '738522217221980222',
})
const browsingTimestamp = Math.floor(Date.now() / 1000)
enum ActivityAssets {
  Logo = 'https://cdn.rcd.gg/PreMiD/websites/N/Novel%20Mania/assets/logo.png',
}
async function getStrings() {
  return presence.getStrings({
    browse: 'general.browsing',
    home: 'general.viewHome',
    privacy: 'general.privacy',
    reading: 'general.reading',
    view: 'general.view',
    volume: 'novelmania.volume',
    profile: 'general.viewProfile',
    lists: 'novelmania.lists',
    news: 'novelmania.news',
    genre: 'novelmania.genre',
    novel: 'novelmania.novel',
    readNovelButton: 'novelmania.readNovelButton',
    readChapterButton: 'novelmania.readChapterButton',
    visitWebsiteButton: 'novelmania.visitWebsiteButton',
    readListButton: 'novelmania.readListButton',
    readNewsButton: 'novelmania.readNewsButton',
    visitUserProfileButton: 'novelmania.visitUserProfileButton',
  })
}
let oldUserLanguage: string | null = null
let strings: Awaited<ReturnType<typeof getStrings>>

presence.on('UpdateData', async () => {
  strings = await getStrings()

  const [showButtons, showTime, hideInfo, userLanguage] = await Promise.all([
    presence.getSetting<boolean>('showButtons') || true,
    presence.getSetting<boolean>('showTimestamp') || true,
    presence.getSetting<boolean>('hideInfo') || false,
    presence.getSetting<string>('lang').catch(() => 'pt')
  ]);

  if (oldUserLanguage !== userLanguage) {
    oldUserLanguage = userLanguage
    strings = await getStrings()
  }


  const presenceData: PresenceData = {
    largeImageKey: ActivityAssets.Logo,
    startTimestamp: showTime ? browsingTimestamp : undefined,
    type: ActivityType.Watching

  }
  const { pathname, origin } = window.location
  const cleanPath = pathname.replace(/\/$/, '') || '/'
  const [part1, part2, part3, part4] = cleanPath.slice(1).split('/') // page, slug (if any), chapter (if any), volume/book  (if any)

  const privacyCheck = (foo: any): string => {
    return !hideInfo ? foo : strings.privacy
  }

  const getPageTitle = (): string => document.querySelector('#main h1')?.textContent || strings.novel
  let buttons: [ButtonData, ButtonData?] | undefined

  switch (part1) {
    case '':
      if (cleanPath === '/') {
        presenceData.state = strings.home;

        buttons = [
          {
            label: strings.visitWebsiteButton,
            url: origin,
          },
        ]
      }
      break

    case 'u': /* Seeing some user profile */
      if (part2) {
        presenceData.details = `${strings.profile}`
        presenceData.state = privacyCheck(getPageTitle());
        buttons = [
          {
            label: strings.visitUserProfileButton,
            url: origin + `/u/${part2}`,
          },
        ]
      }
      break

    case 'novels':
      if (!part2) { /* Searching some novel */
        presenceData.details = `${strings.browse}`;
        presenceData.state = privacyCheck(getPageTitle());

        const params = new URLSearchParams(window.location.search);
        const searchTerm = (document.querySelector('input[name="q"]') as HTMLInputElement)?.value || params.get('q');

        if (searchTerm) {
          presenceData.details = `${strings.browse} ${privacyCheck(decodeURIComponent(searchTerm))}`;
        }

        // Extrai nomes dos filtros - apenas se houver busca ou query params
        if (searchTerm || window.location.search) {
          const badges = document.querySelectorAll('span.inline-flex.rounded-full.border');
          if (badges.length > 0) {
            const visibleFilters: string[] = [];
            for (let i = 0; i < badges.length; i++) {
              const text = badges[i]?.childNodes[0]?.textContent?.trim();
              if (text) visibleFilters.push(text);
            }
            if (visibleFilters.length) {
              presenceData.state = privacyCheck(visibleFilters.join(', '));
            }
          }
        }
        break
      }
      if (part3 === 'capitulos' && part4) { /* Reading some novel's chapter */
        const novelName = document.querySelector("#conteudo-principal > div > header > div > p")?.textContent || part2?.split('-').slice(0, 2).join(' ') || strings.novel;
        const noveltype = document.querySelector("#conteudo-principal > div > main > div > div > header > p")?.textContent || part4?.split('-').slice(0, 2).join(' ') || strings.volume;
        const currentChapTitle = document.querySelector("#reader-chapter-title")?.textContent || novelName;

        presenceData.details = `${strings.reading} ${privacyCheck(novelName)}`;
        presenceData.state = `${privacyCheck(currentChapTitle)} -  ${privacyCheck(noveltype)}`;
        presenceData.smallImageKey = Assets.Reading

        buttons = [
          {
            label: strings.readNovelButton,
            url: origin + `/novels/${part2}`,
          },
          {
            label: strings.readChapterButton,
            url: origin + `/novels/${part2}/capitulos/${part4}`,
          },
        ]
        break
      }
      if (part2) { /* At some novel's page */
        const novelName = document.querySelector("#main > div > h1")?.textContent || strings.novel
        presenceData.state = ` ${strings.view} ${privacyCheck(novelName)}`;

        buttons = [
          {
            label: strings.readNovelButton,
            url: origin + `/novels/${part2}`,
          },
        ]
      }
      break

    case 'listas': /* Searching some lists */
      if (!part2) {
        presenceData.state = `${strings.browse} ${strings.lists}`;
        presenceData.smallImageKey = Assets.Reading
        break
      }

      presenceData.details = `${strings.view} ${strings.lists}`;
      presenceData.state = `${privacyCheck(getPageTitle())} - ${privacyCheck(document.querySelector("#main > div > div:nth-child(2) > a")?.textContent || strings.novel)}`;
      presenceData.smallImageKey = Assets.Reading

      buttons = [
        {
          label: strings.readListButton,
          url: origin + `/listas/${part2}`,
        },
      ]
      break

    case 'noticias':
      if (!part2) {  /* Searching some news */
        presenceData.details = `${strings.reading} ${strings.news}`; /* reading news list */
        presenceData.state = `${privacyCheck(getPageTitle())}`;
        presenceData.smallImageKey = Assets.Reading
        break
      }

      presenceData.details = `${strings.reading} ${strings.news}`; /* reading a news */
      presenceData.state = `${privacyCheck(getPageTitle())}`;
      presenceData.smallImageKey = Assets.Reading

      buttons = [
        {
          label: strings.readNewsButton,
          url: origin + `/noticias/${part2}`,
        },
      ]
      break

    case 'genero': /* Browsing some genres */
      if (part2) {
        presenceData.details = `${strings.browse} ${strings.genre}`;
        presenceData.state = privacyCheck(getPageTitle());
        presenceData.smallImageKey = Assets.Reading
      }
      break

    default: /* At any other page, it doesn't matter */
      presenceData.state = `${strings.view} ${privacyCheck(getPageTitle())}`;
      presenceData.smallImageKey = Assets.Reading
      break
  }

  if (showButtons && buttons && (cleanPath === '/' || !hideInfo))
    presenceData.buttons = buttons

  // Set the activity
  if (presenceData.state) {
    presence.setActivity(presenceData)

    if (!showTime)
      delete presenceData.startTimestamp

  } else {
    presence.clearActivity()
  }
})
