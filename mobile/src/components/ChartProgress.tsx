import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow, spacing } from '../theme/tokens';
import { ProgresoDia } from '../types';

interface ChartProgressProps {
  data: ProgresoDia[];
  title?: string;
  subtitle?: string;
}

export function ChartProgress({
  data,
  title = 'Progreso Semanal del Hogar',
  subtitle = 'Tareas completadas vs creadas en los últimos 7 días',
}: ChartProgressProps) {
  const { colors, theme } = useTheme();

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - spacing.lg * 2 - 32; // margen interior
  const chartHeight = 160;
  const paddingBottom = 28;
  const paddingTop = 20;
  const graphHeight = chartHeight - paddingBottom - paddingTop;

  const maxVal = Math.max(...data.map((d) => Math.max(d.creadas, d.completadas)), 5);
  const stepX = chartWidth / (data.length || 1);

  // Puntos para la línea de tareas completadas
  const linePoints = data
    .map((d, index) => {
      const x = index * stepX + stepX / 2;
      const y = paddingTop + graphHeight - (d.completadas / maxVal) * graphHeight;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...shadow(theme.isDark, 3),
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.softBg, borderColor: colors.border, borderWidth: 1 }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Creadas</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Hechas</Text>
          </View>
        </View>
      </View>

      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.secondary} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={colors.secondary} stopOpacity="0.1" />
          </LinearGradient>
        </Defs>

        {/* Líneas guía de fondo */}
        {[0, 0.5, 1].map((ratio, i) => {
          const y = paddingTop + graphHeight * (1 - ratio);
          return (
            <Line
              key={i}
              x1="0"
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke={colors.border}
              strokeWidth="0.8"
              strokeDasharray="4,4"
              opacity={0.6}
            />
          );
        })}

        {/* Barras de creadas */}
        {data.map((d, index) => {
          const barWidth = 14;
          const x = index * stepX + stepX / 2 - barWidth / 2;
          const h = (d.creadas / maxVal) * graphHeight;
          const y = paddingTop + graphHeight - h;

          return (
            <Rect
              key={`bar-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(h, 2)}
              rx={4}
              fill="url(#barGrad)"
            />
          );
        })}

        {/* Línea conectora de completadas */}
        {data.length > 1 && (
          <Polyline
            points={linePoints}
            fill="none"
            stroke={colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Puntos de completadas y etiquetas de días */}
        {data.map((d, index) => {
          const x = index * stepX + stepX / 2;
          const y = paddingTop + graphHeight - (d.completadas / maxVal) * graphHeight;

          return (
            <React.Fragment key={`dot-${index}`}>
              <Circle
                cx={x}
                cy={y}
                r="4.5"
                fill={colors.surface}
                stroke={colors.primary}
                strokeWidth="2.5"
              />
              <SvgText
                x={x}
                y={chartHeight - 6}
                fontSize="11"
                fill={colors.textSecondary}
                textAnchor="middle"
                fontFamily={fonts.medium}
              >
                {d.dia}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    marginVertical: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
