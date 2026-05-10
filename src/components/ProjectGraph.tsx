import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface ProjectGraphProps {
  files: { path: string }[];
  onFileSelect?: (path: string) => void;
}

export default function ProjectGraph({ files, onFileSelect }: ProjectGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || files.length === 0) return;

    const width = 600;
    const height = 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create a hierarchy from the paths
    const root: any = { name: "root", children: [] };
    files.forEach(f => {
      const parts = f.path.split('/');
      let current = root;
      parts.forEach((part, i) => {
        let child = current.children.find((c: any) => c.name === part);
        if (!child) {
          const currentPath = parts.slice(0, i + 1).join('/');
          child = { name: part, children: [], path: currentPath };
          current.children.push(child);
        }
        current = child;
      });
    });

    const hierarchy = d3.hierarchy(root);
    const links = hierarchy.links();
    const nodes = hierarchy.descendants();

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20));

    const g = svg.append("g");

    const link = g.append("g")
      .attr("stroke", "#1e293b")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    const colorScale = d3.scaleOrdinal<string>()
      .domain([".ts", ".tsx", ".js", ".jsx", ".json", ".md"])
      .range(["#3b82f6", "#60a5fa", "#eab308", "#fbbf24", "#a855f7", "#ec4899"])
      .unknown("#64748b");

    node.append("circle")
      .attr("r", d => d.children ? 6 : 4)
      .attr("fill", d => {
        if (d.children?.length > 0) return "#1e293b";
        const ext = d.data.name.slice(d.data.name.lastIndexOf('.'));
        return colorScale(ext);
      })
      .attr("stroke", d => d.children?.length > 0 ? "#3b82f6" : "#0f172a")
      .attr("stroke-width", 1.5)
      .on("click", (event, d) => {
        if ((!d.children || d.children.length === 0) && onFileSelect && d.data.path) {
          onFileSelect(d.data.path);
        }
      });

    node.append("text")
      .attr("dy", "0.31em")
      .attr("x", 8)
      .attr("text-anchor", "start")
      .text(d => d.data.name)
      .attr("fill", "#94a3b8")
      .attr("font-size", "8px")
      .attr("font-weight", "bold")
      .style("pointer-events", "none")
      .attr("paint-order", "stroke")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 3);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

  }, [files]);

  return (
    <div className="w-full h-[400px] bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden relative group">
      <div className="absolute top-4 left-4 z-10">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded">
          Project Neural Network
        </span>
      </div>
      <svg ref={svgRef} className="w-full h-full cursor-move" viewBox="0 0 600 400" />
    </div>
  );
}
