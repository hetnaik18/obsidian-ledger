import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import stealth

async def scrape_immobiliare():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = await browser.new_page()

        # Applica lo stealth plugin per mimare un browser reale
        await stealth(page)

        try:
            # Naviga al sito immobiliare
            await page.goto('https://www.immobiliare.it/', wait_until='networkidle')

            # Qui inserisci la logica di scraping
            # Ad esempio, cerca annunci o gestisci il captcha se appare
            annunci = await page.query_selector_all('.listing-item')
            results = []
            for annuncio in annunci:
                titolo = await annuncio.query_selector('.titolo')
                prezzo = await annuncio.query_selector('.prezzo')
                link = await annuncio.query_selector('a')

                if titolo and prezzo and link:
                    results.append({
                        'titolo': await titolo.inner_text(),
                        'prezzo': await prezzo.inner_text(),
                        'link': await link.get_attribute('href')
                    })

            print('Annunci trovati:', results)

            # Se il captcha appare, puoi aggiungere logica per risolverlo o attendere
            # Ad esempio, controlla se c'è un elemento captcha
            captcha = await page.query_selector('.captcha-container')
            if captcha:
                print('Captcha rilevato, attendendo risoluzione manuale...')
                await page.wait_for_timeout(30000)  # Attendi 30 secondi per risoluzione manuale

        except Exception as error:
            print('Errore durante lo scraping:', error)
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_immobiliare())
