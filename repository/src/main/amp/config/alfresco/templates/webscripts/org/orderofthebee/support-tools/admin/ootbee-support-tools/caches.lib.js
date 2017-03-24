/**
 * Copyright (C) 2016, 2017 Axel Faust
 * Copyright (C) 2016, 2017 Order of the Bee
 *
 * This file is part of Community Support Tools
 *
 * Community Support Tools is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Community Support Tools is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Community Support Tools. If not, see <http://www.gnu.org/licenses/>.
 */
/*
 * Linked to Alfresco
 * Copyright (C) 2005-2017 Alfresco Software Limited.
 */
function mapCacheMetrics(metrics, cacheInfo)
{
    if (metrics.cacheGets !== undefined && metrics.cacheGets !== null)
    {
        cacheInfo.cacheGets = metrics.cacheGets;
    }
    if (metrics.cacheHits !== undefined && metrics.cacheHits !== null)
    {
        cacheInfo.cacheHits = metrics.cacheHits;
    }
    if (metrics.cacheMisses !== undefined && metrics.cacheMisses !== null)
    {
        cacheInfo.cacheMisses = metrics.cacheMisses;
    }
    if (metrics.cacheEvictions !== undefined && metrics.cacheEvictions !== null)
    {
        cacheInfo.cacheEvictions = metrics.cacheEvictions;
    }
    if (metrics.cacheHitPercentage !== undefined && metrics.cacheHitPercentage !== null)
    {
        cacheInfo.cacheHitRate = metrics.cacheHitPercentage;
    }
    if (metrics.cacheMissPercentage !== undefined && metrics.cacheMissPercentage !== null)
    {
        cacheInfo.cacheMissRate = metrics.cacheMissPercentage;
    }
}

function buildCacheInfo(cacheName, cache, propertyGetter)
{
    var maxItems, cacheInfo, invHandler, alfCacheStatsEnabled, alfCacheStats, stats;

    maxItems = propertyGetter('cache.' + cacheName + '.maxItems') || '-1';

    cacheInfo = {
        name : cacheName,
        definedType : propertyGetter('cache.' + cacheName + '.cluster.type') || '',
        type : '',
        size : cache.keys.size(),
        maxSize : parseInt(maxItems, 10),
        cacheGets : -1,
        cacheHits : -1,
        cacheHitRate : -1,
        cacheMisses : -1,
        cacheMissRate : -1,
        cacheEvictions : -1
    };

    // some cache implementations (i.e. EE) may be using proxies where the class is not really informative
    if (Packages.java.lang.reflect.Proxy.isProxyClass(cache.class))
    {
        // maybe the invocation handler provides access to the backing cache
        invHandler = Packages.java.lang.reflect.Proxy.getInvocationHandler(cache);
        if (invHandler.backingObject !== undefined && invHandler.backingObject !== null)
        {
            cache = invHandler.backingObject;
            cacheInfo.type = String(cache.class.name);
        }
    }
    else
    {
        cacheInfo.type = String(cache.class.name);
    }

    alfCacheStatsEnabled = String(propertyGetter('cache.' + cacheName + '.tx.statsEnabled') || 'false') === 'true';

    if (alfCacheStatsEnabled)
    {
        // in this case the TransactionalCache facade should manage statistics via a global utility on Alfresco-tier
        // note: this will report incorrect numbers if some code does not use the facade
        alfCacheStats = Packages.org.orderofthebee.addons.support.tools.repo.caches.CacheLookupUtils.resolveStatisticsViaTransactional(cacheName);
    }

    try
    {
        if (cacheInfo.type === 'org.alfresco.repo.cache.DefaultSimpleCache')
        {
            stats = Packages.org.orderofthebee.addons.support.tools.repo.caches.CacheLookupUtils.getDefaultSimpleCacheStats(cache);

            cacheInfo.cacheGets = stats.requestCount();
            cacheInfo.cacheHits = stats.hitCount();
            cacheInfo.cacheMisses = stats.missCount();
            cacheInfo.cacheEvictions = stats.evictionCount();
            cacheInfo.cacheHitRate = stats.hitRate() * 100;
            cacheInfo.cacheMissRate = stats.missRate() * 100;
        }
        else if (cacheInfo.type === 'org.alfresco.enterprise.repo.cluster.cache.InvalidatingCache')
        {
            stats = Packages.org.orderofthebee.addons.support.tools.repo.caches.CacheLookupUtils
                    .getHzInvalidatingCacheStats(cache);

            cacheInfo.cacheGets = stats.requestCount();
            cacheInfo.cacheHits = stats.hitCount();
            cacheInfo.cacheMisses = stats.missCount();
            cacheInfo.cacheEvictions = stats.evictionCount();
            cacheInfo.cacheHitRate = stats.hitRate() * 100;
            cacheInfo.cacheMissRate = stats.missRate() * 100;
        }
        else if (cacheInfo.type === 'org.alfresco.enterprise.repo.cluster.cache.HazelcastSimpleCache')
        {
            stats = Packages.org.orderofthebee.addons.support.tools.repo.caches.CacheLookupUtils
                    .getHzSimpleCacheStats(cache);

            /* The values that Hazelcast provides are complete bogus. Hits are only tracked on locally owned entries. The numberOfGets are tracked on a separate layer than hits, and these values appear to be out of sync quite often (hits larger
            than gets). */
            if (alfCacheStats !== undefined && alfCacheStats !== null)
            {
                // fallback to Alfresco cache statistics
                mapCacheMetrics(alfCacheStats, cacheInfo);
            }
            else
            {
                cacheInfo.cacheGets = stats.operationStats.numberOfGets;
                // cacheInfo.cacheHits = stats.hits;
                // cacheInfo.cacheMisses = cacheInfo.cacheGets - cacheInfo.cacheHits;
                // cacheInfo.cacheHitRate = cacheInfo.cacheGets > 0 ? (cacheInfo.cacheHits / cacheInfo.cacheGets * 100) : 1;
                // cacheInfo.cacheMissRate = cacheInfo.cacheGets > 0 ? (cacheInfo.cacheMisses / cacheInfo.cacheGets * 100) : 0;
                // can't find anything about evictions in either LocalMapStats or LocalMapOperationStats
            }
        }
        // check support of CacheWithMetrics without requiring explicit interface inheritance
        else if (cache.metrics !== undefined && cache.metrics !== null)
        {
            mapCacheMetrics(cache.metrics, cacheInfo);
        }
        else  if (alfCacheStats !== undefined && alfCacheStats !== null)
        {
            // fallback to Alfresco cache statistics
            mapCacheMetrics(alfCacheStats, cacheInfo);
        }
    }
    catch (e)
    {
        logger.log('Failed to retrieve statistics from cache ' + cacheName + ': ' + String(e));
    }

    return cacheInfo;
}

function buildPropertyGetter(ctxt)
{
    var globalProperties, placeholderHelper, propertyGetter;

    globalProperties = ctxt.getBean('global-properties', Packages.java.util.Properties);
    placeholderHelper = new Packages.org.springframework.util.PropertyPlaceholderHelper('${', '}', ':', true);

    propertyGetter = function(propertyName)
    {
        var propertyValue;

        propertyValue = globalProperties[propertyName];
        if (propertyValue)
        {
            propertyValue = placeholderHelper.replacePlaceholders(propertyValue, globalProperties);
        }
        
        return propertyValue;
    };

    return propertyGetter;
}

/* exported buildCaches */
function buildCaches()
{
    var TransactionalCache, ctxt, propertyGetter, cacheBeanNames, cacheInfos, idx, cacheBeanName, cache, cacheInfo;

    TransactionalCache = Packages.org.alfresco.repo.cache.TransactionalCache;
    ctxt = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    propertyGetter = buildPropertyGetter(ctxt);

    cacheInfos = [];
    cacheBeanNames = ctxt.getBeanNamesForType(Packages.org.alfresco.repo.cache.SimpleCache, false, false);

    for (idx = 0; idx < cacheBeanNames.length; idx++)
    {
        cacheBeanName = String(cacheBeanNames[idx]);

        // only want non-transactional caches
        cache = ctxt.getBean(cacheBeanName, Packages.org.alfresco.repo.cache.SimpleCache);
        if (!(cache instanceof TransactionalCache))
        {
            cacheInfo = buildCacheInfo(cache.cacheName || cacheBeanName, cache, propertyGetter);
            cacheInfos.push(cacheInfo);
        }
    }

    cacheInfos.sort(function(a, b)
    {
        return a.name.localeCompare(b.name);
    });

    model.cacheInfos = cacheInfos;
}