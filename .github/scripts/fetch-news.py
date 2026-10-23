import html
import json
import re
import gzip
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


FEEDS = [
    {
        "name": "Agência Brasil",
        "region": "Brasil",
        "url": "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
        "hosts": ["ebc.com.br"],
    },
    {
        "name": "G1",
        "region": "Brasil",
        "url": "https://g1.globo.com/rss/g1/",
        "hosts": ["g1.globo.com", "globo.com"],
        "image_hosts": ["glbimg.com"],
        "limit": 30,
    },
    {
        "name": "Folha de S.Paulo",
        "region": "Brasil",
        "url": "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml",
        "hosts": ["folha.com.br", "folha.uol.com.br"],
        "image_hosts": ["folha.uol.com.br", "uol.com.br"],
    },
    {
        "name": "CNN Brasil",
        "region": "Brasil",
        "url": "https://www.cnnbrasil.com.br/feed/",
        "hosts": ["cnnbrasil.com.br"],
        "image_hosts": ["cnnbrasil.com.br"],
    },
]


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.images = []

    def handle_data(self, data):
        self.parts.append(data)

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "img":
            values = dict(attrs)
            self.images.extend([values.get("src", ""), values.get("data-src", "")])


def text_content(value):
    parser = TextExtractor()
    parser.feed(value or "")
    return re.sub(r"\s+", " ", html.unescape(" ".join(parser.parts))).strip(), parser.images


def field(item, *names):
    wanted = set(names)
    for element in item.iter():
        if element.tag.split("}")[-1].lower() in wanted and element.text:
            return element.text.strip()
    return ""


def safe_url(value, allowed_hosts):
    try:
        parsed = urlparse(value.strip())
        if parsed.hostname == "redir.folha.com.br" and "*https://" in parsed.path:
            value = parsed.path.split("*", 1)[1]
            parsed = urlparse(value)
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or not any(host == allowed or host.endswith("." + allowed) for allowed in allowed_hosts):
            return ""
        return parsed.geturl()
    except ValueError:
        return ""


def article_image(item, description_images, source):
    image_urls = []
    for element in item.iter():
        local_name = element.tag.split("}")[-1].lower()
        if local_name in {"content", "thumbnail", "enclosure"}:
            image_urls.append(element.attrib.get("url", ""))
    image_urls.extend(description_images)
    for value in image_urls:
        image = safe_url(value, source.get("image_hosts", source["hosts"]))
        if image:
            return image
    return ""


def publication_date(value):
    if not value:
        return ""
    try:
        date = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            date = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return ""
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    return date.astimezone(timezone.utc).isoformat()


def read_feed(source):
    request = urllib.request.Request(source["url"], headers={"User-Agent": "VoxiaNewsFeed/1.0 (+https://phyetroa.github.io/VoxIA/)"})
    with urllib.request.urlopen(request, timeout=25) as response:
        content = response.read()
        if content.startswith(b"\x1f\x8b"):
            content = gzip.decompress(content)
        declaration = re.search(br"encoding=[\"']([^\"']+)", content[:200], re.IGNORECASE)
        encoding = declaration.group(1).decode("ascii") if declaration else source.get("encoding", "utf-8")
        root = ET.fromstring(content.decode(encoding, errors="replace"))
    entries = [element for element in root.iter() if element.tag.split("}")[-1].lower() in {"item", "entry"}]
    articles = []
    for item in entries:
        title, _ = text_content(field(item, "title"))
        description, images = text_content(field(item, "description", "summary", "encoded", "content"))
        link = field(item, "link")
        if not link:
            for element in item.iter():
                if element.tag.split("}")[-1].lower() == "link" and element.attrib.get("href"):
                    link = element.attrib["href"]
                    break
        link = safe_url(link, source["hosts"])
        if not title or not link:
            continue
        if not description:
            description = title
        date = publication_date(field(item, "pubdate", "published", "updated", "date"))
        if not date:
            local_date = re.search(r"\((\d{1,2})/(\d{1,2})/(\d{4}) - (\d{1,2})h(\d{2})\)", description)
            if local_date:
                month, day, year, hour, minute = map(int, local_date.groups())
                date = datetime(year, month, day, hour, minute, tzinfo=timezone(timedelta(hours=-3))).astimezone(timezone.utc).isoformat()
        image = article_image(item, images, source)
        local_coverage = urlparse(link).path.lower().startswith("/pe/") or "pernambuco" in f"{title} {description}".lower()
        region = "Pernambuco" if source["name"] == "G1" and local_coverage else source["region"]
        publisher = "G1 Pernambuco" if source["name"] == "G1" and local_coverage else source["name"]
        articles.append({
            "title": title,
            "link": link,
            "summary": description[:357].rstrip() + ("…" if len(description) > 360 else ""),
            "publishedAt": date,
            "image": image,
            "source": publisher,
            "region": region,
        })
        if len(articles) == source.get("limit", 12):
            break
    return articles


all_articles = []
failed_sources = []
for feed in FEEDS:
    try:
        articles = read_feed(feed)
        all_articles.extend(articles)
        if not articles:
            failed_sources.append(feed["name"])
    except Exception as error:
        print(f"Feed indisponível: {feed['name']} ({error})")
        failed_sources.append(feed["name"])

unique = {article["link"]: article for article in all_articles}
articles = sorted(unique.values(), key=lambda article: article["publishedAt"], reverse=True)[:60]
if not articles:
    raise SystemExit("Nenhum feed de notícias pôde ser carregado; publicação cancelada para preservar os dados existentes.")

payload = {
    "updatedAt": datetime.now(timezone.utc).isoformat(),
    "articles": articles,
    "unavailableSources": failed_sources,
}
output = Path("public/news-feed.json")
output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"Salvas {len(articles)} notícias de {len(FEEDS) - len(failed_sources)} fontes em {output}.")
