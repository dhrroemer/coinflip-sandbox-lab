import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeDollarSign,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clock3,
  Coins,
  FastForward,
  Gauge,
  LineChart,
  LockKeyhole,
  Pause,
  Play,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from 'lucide-react';
import './App.css';

type TradeSide = 'buy' | 'sell';

type PricePoint = {
  date: Date;
  price: number;
};

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  unlocked: boolean;
};

const STARTING_CASH = 10_000;
const START_DATE = new Date('2017-01-03T00:00:00');
const INITIAL_PRICE = 1038;

const formatMoney = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
const formatPrice = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

function createNextPoint(point: PricePoint, step: number): PricePoint {
  const nextDate = new Date(point.date);
  nextDate.setDate(nextDate.getDate() + step);
  const cycle = Math.sin(nextDate.getTime() / 2.2e9) * 0.023;
  const momentum = Math.sin(nextDate.getTime() / 6.4e9) * 0.015;
  const nextPrice = Math.max(120, point.price * (1 + cycle + momentum));
  return { date: nextDate, price: nextPrice };
}

function buildHistory() {
  const points: PricePoint[] = [{ date: START_DATE, price: INITIAL_PRICE }];
  for (let index = 1; index < 26; index += 1)
    points.push(createNextPoint(points[index - 1], 7));
  return points;
}

function getAchievements(
  price: number,
  averageBuyPrice: number,
  hadLossSale: boolean,
  lowestPrice: number,
): Achievement[] {
  const gain = averageBuyPrice
    ? ((price - averageBuyPrice) / averageBuyPrice) * 100
    : 0;
  return [
    {
      id: 'diamond',
      title: 'Diamond Hands',
      description: 'Hold through a 50% drop',
      icon: LockKeyhole,
      unlocked: lowestPrice <= averageBuyPrice * 0.5,
    },
    {
      id: 'paper',
      title: 'Paper Hands',
      description: 'Sell at a minor loss',
      icon: TrendingDown,
      unlocked: hadLossSale,
    },
    {
      id: 'moon',
      title: 'To the Moon',
      description: 'Reach a 300% gain',
      icon: Zap,
      unlocked: gain >= 300,
    },
    {
      id: 'first-trade',
      title: 'First Blood',
      description: 'Complete your first trade',
      icon: ShoppingCart,
      unlocked: averageBuyPrice > 0,
    },
  ];
}

function MarketChart({
  history,
  currentPrice,
}: {
  history: PricePoint[];
  currentPrice: number;
}) {
  const chartPoints = history.slice(-24);
  const min = Math.min(...chartPoints.map((point) => point.price)) * 0.96;
  const max = Math.max(...chartPoints.map((point) => point.price)) * 1.04;
  const points = chartPoints
    .map(
      (point, index) =>
        `${(index / (chartPoints.length - 1)) * 100},${100 - ((point.price - min) / (max - min)) * 100}`,
    )
    .join(' ');
  const fillPoints = `0,100 ${points} 100,100`;
  const change =
    ((currentPrice - chartPoints[0].price) / chartPoints[0].price) * 100;

  return (
    <div className="chart-shell">
      <div className="chart-grid" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="chart-svg"
        role="img"
        aria-label="Simulated price chart"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8cff00" stopOpacity=".28" />
            <stop offset="100%" stopColor="#8cff00" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill="url(#areaFill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#b6ff2b"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx="100"
          cy={100 - ((currentPrice - min) / (max - min)) * 100}
          r="1.6"
          fill="#f4f7ee"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="chart-axis">
        <span>{formatPrice(max)}</span>
        <span>{formatPrice((max + min) / 2)}</span>
        <span>{formatPrice(min)}</span>
      </div>
      <div className="chart-caption">
        <span>{formatDate(chartPoints[0].date)}</span>
        <span className={change >= 0 ? 'positive' : 'negative'}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(1)}% since start
        </span>
        <span>{formatDate(chartPoints[chartPoints.length - 1].date)}</span>
      </div>
    </div>
  );
}

function App() {
  const [history, setHistory] = useState(buildHistory);
  const [cash, setCash] = useState(STARTING_CASH);
  const [holdings, setHoldings] = useState(0);
  const [averageBuyPrice, setAverageBuyPrice] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hadLossSale, setHadLossSale] = useState(false);

  const current = history[history.length - 1];
  const previous = history[history.length - 2];
  const marketChange =
    ((current.price - previous.price) / previous.price) * 100;
  const portfolioValue = cash + holdings * current.price;
  const totalReturn = ((portfolioValue - STARTING_CASH) / STARTING_CASH) * 100;
  const lowestPrice = Math.min(...history.map((point) => point.price));
  const achievements = useMemo(
    () =>
      getAchievements(current.price, averageBuyPrice, hadLossSale, lowestPrice),
    [current.price, averageBuyPrice, hadLossSale, lowestPrice],
  );

  const advance = (days = speed === 3 ? 7 : speed === 2 ? 3 : 1) =>
    setHistory((items) => [
      ...items,
      createNextPoint(items[items.length - 1], days),
    ]);
  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => advance(), 900);
    return () => window.clearInterval(timer);
  }, [isPlaying, speed]);
  const trade = (side: TradeSide) => {
    const amount = Math.max(
      1,
      Math.floor(
        (side === 'buy' ? cash : holdings * current.price) / 4 / current.price,
      ),
    );
    if (side === 'buy') {
      const cost = amount * current.price;
      setCash((value) => value - cost);
      setHoldings((value) => value + amount);
      setAverageBuyPrice(
        (value) => (value * holdings + cost) / (holdings + amount),
      );
    } else if (holdings > 0) {
      const soldAmount = Math.min(amount, holdings);
      setCash((value) => value + soldAmount * current.price);
      setHoldings((value) => value - soldAmount);
      if (current.price < averageBuyPrice) setHadLossSale(true);
    }
  };
  const reset = () => {
    setHistory(buildHistory());
    setCash(STARTING_CASH);
    setHoldings(0);
    setAverageBuyPrice(0);
    setHadLossSale(false);
    setIsPlaying(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">
          <span className="brand-icon">
            <Coins size={22} />
          </span>
          <span>
            <strong>COINFLIP</strong>
            <small>THE SANDBOX LAB</small>
          </span>
        </div>
        <div className="top-status">
          <span className="status-dot" /> SIMULATION ONLINE{' '}
          <span className="divider" /> <CircleHelp size={15} /> HELP
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <div className="eyebrow">
            <Activity size={14} /> CONTROL DECK
          </div>
          <div className="side-section">
            <span className="side-label">CURRENT ERA</span>
            <div className="era-select">
              <CalendarDays size={16} />
              <span>{current.date.getFullYear()} MARKET</span>
              <ChevronDown size={14} />
            </div>
            <div className="date-readout">
              <span>SIM DATE</span>
              <strong>{formatDate(current.date)}</strong>
            </div>
          </div>
          <div className="side-section">
            <span className="side-label">TIME DILATION</span>
            <div className="speed-grid">
              {[1, 2, 3].map((value) => (
                <button
                  key={value}
                  className={speed === value ? 'active' : ''}
                  onClick={() => setSpeed(value)}
                >
                  <span>{value === 1 ? '1D' : value === 2 ? '3D' : '1W'}</span>
                  <small>
                    {value === 1 ? 'DAY' : value === 2 ? '3 DAYS' : 'WEEK'}
                  </small>
                </button>
              ))}
            </div>
          </div>
          <div className="side-section">
            <span className="side-label">MISSION STATUS</span>
            <div className="mission">
              <span>
                <Gauge size={15} /> NET RETURN
              </span>
              <strong className={totalReturn >= 0 ? 'positive' : 'negative'}>
                {totalReturn >= 0 ? '+' : ''}
                {totalReturn.toFixed(2)}%
              </strong>
            </div>
            <div className="mission">
              <span>
                <Trophy size={15} /> BADGES
              </span>
              <strong>
                {
                  achievements.filter((achievement) => achievement.unlocked)
                    .length
                }
                /4
              </strong>
            </div>
          </div>
          <button className="reset-button" onClick={reset}>
            <RotateCcw size={15} /> RESET SIMULATION
          </button>
          <div className="sidebar-footer">
            CFLP // BUILD 0.9.17
            <br />
            <span>LOCAL SESSION / NO DATA LEAVES DEVICE</span>
          </div>
        </aside>
        <section className="content">
          <div className="content-heading">
            <div>
              <p className="eyebrow lime">
                <Sparkles size={14} /> LIVE MARKET FEED
              </p>
              <h1>
                Crypto &amp; Stock <em>Sandbox</em>
              </h1>
              <p className="subheading">
                Learn the market. Break the market. Start over.
              </p>
            </div>
            <div className="clock-chip">
              <Clock3 size={16} />
              <span>MARKET CLOCK</span>
              <strong>{isPlaying ? 'RUNNING' : 'PAUSED'}</strong>
            </div>
          </div>
          <div className="asset-bar">
            <div className="asset-name">
              <span className="btc-mark">₿</span>
              <div>
                <strong>BITCOIN / USD</strong>
                <small>BTC-USD · CRYPTO</small>
              </div>
            </div>
            <div className="asset-price">
              <strong>{formatPrice(current.price)}</strong>
              <span className={marketChange >= 0 ? 'positive' : 'negative'}>
                {marketChange >= 0 ? (
                  <TrendingUp size={15} />
                ) : (
                  <TrendingDown size={15} />
                )}
                {marketChange >= 0 ? '+' : ''}
                {marketChange.toFixed(2)}% <small>24H</small>
              </span>
            </div>
            <div className="asset-meta">
              <span>
                VOL <strong>842.6K</strong>
              </span>
              <span>
                HIGH <strong>{formatPrice(current.price * 1.08)}</strong>
              </span>
              <span>
                LOW <strong>{formatPrice(current.price * 0.93)}</strong>
              </span>
            </div>
          </div>
          <div className="main-grid">
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">
                    <LineChart size={14} /> PRICE ACTION
                  </span>
                  <h2>
                    BTC/USD <span>SIMULATED</span>
                  </h2>
                </div>
                <div className="chart-legend">
                  <span /> MARKET PRICE
                </div>
              </div>
              <MarketChart history={history} currentPrice={current.price} />
              <div className="chart-controls">
                <button
                  className="play-button"
                  onClick={() => {
                    setIsPlaying(!isPlaying);
                    if (!isPlaying) advance();
                  }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}{' '}
                  {isPlaying ? 'PAUSE SIM' : 'PLAY SIM'}
                </button>
                <div className="fast-forward">
                  <button onClick={() => advance()}>
                    <FastForward size={16} /> FAST FORWARD
                  </button>
                  <span>
                    +{speed === 3 ? '1 WEEK' : speed === 2 ? '3 DAYS' : '1 DAY'}
                  </span>
                </div>
              </div>
            </div>
            <div className="panel trade-panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">
                    <Wallet size={14} /> ORDER TERMINAL
                  </span>
                  <h2>MAKE YOUR MOVE</h2>
                </div>
                <span className="live-pill">LIVE</span>
              </div>
              <div className="order-summary">
                <span>AVAILABLE CASH</span>
                <strong>{formatMoney(cash)}</strong>
              </div>
              <div className="trade-actions">
                <button className="buy-button" onClick={() => trade('buy')}>
                  <span>BUY</span>
                  <small>1/4 CASH</small>
                </button>
                <button className="sell-button" onClick={() => trade('sell')}>
                  <span>SELL</span>
                  <small>1/4 POSITION</small>
                </button>
              </div>
              <div className="position-row">
                <span>POSITION</span>
                <strong>{holdings.toFixed(4)} BTC</strong>
              </div>
              <div className="position-row">
                <span>AVG. BUY PRICE</span>
                <strong>
                  {averageBuyPrice ? formatPrice(averageBuyPrice) : '—'}
                </strong>
              </div>
              <div className="order-note">
                <BadgeDollarSign size={15} /> Each trade uses 25% of your
                available side.
              </div>
            </div>
          </div>
          <div className="lower-grid">
            <div className="panel portfolio-panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">
                    <Wallet size={14} /> PORTFOLIO VALUE
                  </span>
                  <h2>{formatMoney(portfolioValue)}</h2>
                </div>
                <span
                  className={
                    totalReturn >= 0
                      ? 'return-tag positive'
                      : 'return-tag negative'
                  }
                >
                  {totalReturn >= 0 ? '+' : ''}
                  {totalReturn.toFixed(2)}%
                </span>
              </div>
              <div className="portfolio-bars">
                <div>
                  <span>CASH</span>
                  <strong>{formatMoney(cash)}</strong>
                  <i
                    style={{
                      width: `${Math.min(100, (cash / portfolioValue) * 100)}%`,
                    }}
                  />
                </div>
                <div>
                  <span>BTC HOLDINGS</span>
                  <strong>{formatMoney(holdings * current.price)}</strong>
                  <i
                    className="lime-bar"
                    style={{
                      width: `${Math.min(100, ((holdings * current.price) / portfolioValue) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="panel achievements-panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">
                    <Trophy size={14} /> ACHIEVEMENTS
                  </span>
                  <h2>BADGE BOARD</h2>
                </div>
                <span className="progress-count">
                  {
                    achievements.filter((achievement) => achievement.unlocked)
                      .length
                  }{' '}
                  / 4 UNLOCKED
                </span>
              </div>
              <div className="badge-list">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon;
                  return (
                    <div
                      className={`badge ${achievement.unlocked ? 'unlocked' : ''}`}
                      key={achievement.id}
                    >
                      <span className="badge-icon">
                        {achievement.unlocked ? (
                          <Icon size={20} />
                        ) : (
                          <LockKeyhole size={17} />
                        )}
                      </span>
                      <div>
                        <strong>{achievement.title}</strong>
                        <small>{achievement.description}</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
