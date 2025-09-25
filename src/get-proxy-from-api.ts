import axios from "axios";

export async function getProxyFromApi(): Promise<string | null> {
  try {
    const response = await axios.get("https://api.getproxylist.com/proxy", {
      params: {
        apiKey: "9cc2fc7ccae16c6e5cd3c4851f67e00c95dd0ebc",
        country: ["US"],
        protocol: ["https"],
        anonymity: ["high anonymity"], // Opcionalmente: "elite"
        allowsHttps: 1,
        allowsRefererHeader: 1,
        allowsUserAgentHeader: 1,
        allowsCustomHeaders: 1,
        allowsCookies: 1,
        allowsPost: 1,
        minUptime: 90,
        maxConnectTime: 1,
        maxSecondsToFirstByte: 1,
        minDownloadSpeed: 10000,
        lastTested: 600, // Testado nos últimos 10 minutos
      },
    });
    
    const { ip, port, protocol, username, password } = response.data;

    let proxy = `${protocol}://`;
    if (username && password) proxy += `${username}:${password}@`;
    proxy += `${ip}:${port}`;

    return proxy;
  } catch (error) {
    console.error("❌ Erro ao obter proxy:", (error as Error).message);
    return null;
  }
}
